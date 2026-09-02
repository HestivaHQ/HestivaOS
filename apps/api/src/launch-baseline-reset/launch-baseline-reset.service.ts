import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma.service';
import {
  classifyLaunchBaselineTables,
  LAUNCH_BASELINE_CONFIRMATION,
  quoteSqlIdentifier,
} from './launch-baseline-reset.contract';

type TableRow = { tablename: string };
type CountRow = { count: bigint | number };
type PathRow = { storage_path: string | null };

export type LaunchBaselineImpact = {
  confirmationPhrase: string;
  impactFingerprint: string;
  ready: boolean;
  blockers: string[];
  unknownTables: string[];
  resetTablesPresent: string[];
  preservedTablesPresent: string[];
  tableCounts: Record<string, number>;
  totalRowsToDelete: number;
  storage: {
    workOrderObjects: number;
    messagingObjects: number;
    unresolvedQuotePhotoObjects: number;
    serviceRoleConfigured: boolean;
  };
  preserved: {
    users: number;
    userAccessChanges: number;
    businessProfile: number;
    services: number;
    cleaningJobTemplates: number;
    correspondenceTemplates: number;
  };
  irreversibleExternalEffectsWarning: string;
};

export type LaunchBaselineResetResult = {
  reset: true;
  deletedDatabaseRows: number;
  deletedStorageObjects: number;
  verification: LaunchBaselineImpact;
};

@Injectable()
export class LaunchBaselineResetService {
  private readonly storage: SupabaseClient | null;
  private readonly workOrderBucket: string;
  private readonly messagingBucket: string;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    this.storage = url && serviceRoleKey
      ? createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
    this.workOrderBucket = process.env.SUPABASE_WORK_ORDER_PHOTOS_BUCKET?.trim() || 'work-order-photos';
    this.messagingBucket = process.env.SUPABASE_MESSAGING_MEDIA_BUCKET?.trim() || 'messaging-media';
  }

  async impact(): Promise<LaunchBaselineImpact> {
    const actualTables = await this.publicTables();
    const classified = classifyLaunchBaselineTables(actualTables);
    const tableCounts: Record<string, number> = {};
    for (const table of classified.resetTablesPresent) tableCounts[table] = await this.countTable(table);

    const workOrderPaths = await this.workOrderStoragePaths(new Set(actualTables));
    const messagingPaths = await this.messagingStoragePaths(new Set(actualTables));
    const unresolvedQuotePhotoPaths = await this.quotePhotoStoragePaths(new Set(actualTables));
    const blockers: string[] = [];

    if (classified.unknownTables.length > 0) {
      blockers.push(`Unclassified public tables: ${classified.unknownTables.join(', ')}`);
    }
    if ((workOrderPaths.length > 0 || messagingPaths.length > 0) && !this.storage) {
      blockers.push('Supabase service-role Storage access is required to remove private operational objects.');
    }
    if (unresolvedQuotePhotoPaths.length > 0) {
      blockers.push('Quote photo Storage ownership is not classified for launch reset; refusing to delete database metadata first.');
    }

    const totalRowsToDelete = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
    const preserved = await this.preservedCounts(new Set(actualTables));
    const fingerprintPayload = {
      actualTables,
      tableCounts,
      workOrderPaths: [...workOrderPaths].sort(),
      messagingPaths: [...messagingPaths].sort(),
      unresolvedQuotePhotoPaths: [...unresolvedQuotePhotoPaths].sort(),
      blockers,
    };
    const impactFingerprint = createHash('sha256').update(JSON.stringify(fingerprintPayload)).digest('hex');

    return {
      confirmationPhrase: LAUNCH_BASELINE_CONFIRMATION,
      impactFingerprint,
      ready: blockers.length === 0,
      blockers,
      unknownTables: classified.unknownTables,
      resetTablesPresent: classified.resetTablesPresent,
      preservedTablesPresent: classified.preservedTablesPresent,
      tableCounts,
      totalRowsToDelete,
      storage: {
        workOrderObjects: workOrderPaths.length,
        messagingObjects: messagingPaths.length,
        unresolvedQuotePhotoObjects: unresolvedQuotePhotoPaths.length,
        serviceRoleConfigured: this.storage !== null,
      },
      preserved,
      irreversibleExternalEffectsWarning:
        'This reset cannot unsend email, WhatsApp or Messenger traffic that already reached an external provider.',
    };
  }

  async reset(actorUserId: string, input: { confirmationPhrase?: string; impactFingerprint?: string }): Promise<LaunchBaselineResetResult> {
    if (input.confirmationPhrase !== LAUNCH_BASELINE_CONFIRMATION) {
      throw new BadRequestException('The launch-baseline confirmation phrase must match exactly.');
    }
    if (!input.impactFingerprint?.trim()) throw new BadRequestException('A current impact fingerprint is required.');

    const before = await this.impact();
    if (before.impactFingerprint !== input.impactFingerprint) {
      throw new ConflictException('Launch-baseline impact changed after preview. Preview again before resetting.');
    }
    if (!before.ready) throw new ConflictException(`Launch-baseline reset is blocked: ${before.blockers.join(' ')}`);

    const actualTables = new Set(await this.publicTables());
    const workOrderPaths = await this.workOrderStoragePaths(actualTables);
    const messagingPaths = await this.messagingStoragePaths(actualTables);

    // Storage is removed before database metadata. If database cleanup then fails, the
    // remaining records are still disposable pre-launch rows and a retry can finish the
    // reset. The reverse order could permanently lose the only exact object paths.
    await this.removeStorageObjects(this.workOrderBucket, workOrderPaths);
    await this.removeStorageObjects(this.messagingBucket, messagingPaths);

    const tableNames = before.resetTablesPresent.map(quoteSqlIdentifier);
    if (tableNames.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`TRUNCATE TABLE ${Prisma.raw(tableNames.join(', '))}`);
      });
    }

    const verification = await this.impact();
    const remainingRows = Object.values(verification.tableCounts).reduce((sum, count) => sum + count, 0);
    if (!verification.ready || remainingRows !== 0 || verification.storage.workOrderObjects !== 0 || verification.storage.messagingObjects !== 0) {
      throw new ServiceUnavailableException('Launch-baseline reset did not verify clean. Do not begin live operations.');
    }

    // Keep an operator-visible server event without storing customer/test payloads.
    console.warn(JSON.stringify({
      event: 'admin_launch_baseline_reset',
      actorUserId,
      deletedDatabaseRows: before.totalRowsToDelete,
      deletedStorageObjects: workOrderPaths.length + messagingPaths.length,
      timestamp: new Date().toISOString(),
    }));

    return {
      reset: true,
      deletedDatabaseRows: before.totalRowsToDelete,
      deletedStorageObjects: workOrderPaths.length + messagingPaths.length,
      verification,
    };
  }

  private async publicTables(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<TableRow[]>(Prisma.sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    return rows.map((row) => row.tablename);
  }

  private async countTable(table: string): Promise<number> {
    const identifier = quoteSqlIdentifier(table);
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count FROM ${Prisma.raw(identifier)}
    `);
    return Number(rows[0]?.count ?? 0);
  }

  private async workOrderStoragePaths(tables: Set<string>): Promise<string[]> {
    const paths = new Set<string>();
    if (tables.has('work_order_photos')) {
      const rows = await this.prisma.$queryRaw<PathRow[]>(Prisma.sql`SELECT storage_path FROM work_order_photos WHERE storage_path IS NOT NULL`);
      for (const row of rows) if (row.storage_path) paths.add(row.storage_path);
    }
    if (tables.has('execution_section_evidence')) {
      const rows = await this.prisma.$queryRaw<PathRow[]>(Prisma.sql`SELECT storage_path FROM execution_section_evidence WHERE storage_path IS NOT NULL`);
      for (const row of rows) if (row.storage_path) paths.add(row.storage_path);
    }
    if (tables.has('work_order_temporary_access_credentials')) {
      const rows = await this.prisma.$queryRaw<PathRow[]>(Prisma.sql`
        SELECT attachment_storage_path AS storage_path
        FROM work_order_temporary_access_credentials
        WHERE attachment_storage_path IS NOT NULL
      `);
      for (const row of rows) if (row.storage_path) paths.add(row.storage_path);
    }
    return [...paths];
  }

  private async messagingStoragePaths(tables: Set<string>): Promise<string[]> {
    if (!tables.has('messaging_media_assets')) return [];
    const rows = await this.prisma.$queryRaw<PathRow[]>(Prisma.sql`
      SELECT storage_path FROM messaging_media_assets WHERE storage_path IS NOT NULL
    `);
    return [...new Set(rows.flatMap((row) => (row.storage_path ? [row.storage_path] : [])))];
  }

  private async quotePhotoStoragePaths(tables: Set<string>): Promise<string[]> {
    if (!tables.has('quote_photos')) return [];
    const rows = await this.prisma.$queryRaw<PathRow[]>(Prisma.sql`SELECT storage_path FROM quote_photos WHERE storage_path IS NOT NULL`);
    return [...new Set(rows.flatMap((row) => (row.storage_path ? [row.storage_path] : [])))];
  }

  private async removeStorageObjects(bucket: string, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    if (!this.storage) throw new ServiceUnavailableException('Supabase service-role Storage access is not configured.');
    for (let index = 0; index < paths.length; index += 100) {
      const batch = paths.slice(index, index + 100);
      const { error } = await this.storage.storage.from(bucket).remove(batch);
      if (error) throw new ServiceUnavailableException(`Unable to remove launch-reset Storage objects from ${bucket}.`);
    }
  }

  private async preservedCounts(tables: Set<string>) {
    const count = async (table: string) => {
      if (!tables.has(table)) return 0;
      const escaped = `"${table.replaceAll('"', '""')}"`;
      const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM ${Prisma.raw(escaped)}`);
      return Number(rows[0]?.count ?? 0);
    };
    return {
      users: await count('users'),
      userAccessChanges: await count('user_access_changes'),
      businessProfile: await count('business_profiles'),
      services: await count('services'),
      cleaningJobTemplates: await count('cleaning_job_templates'),
      correspondenceTemplates: await count('correspondence_templates'),
    };
  }
}
