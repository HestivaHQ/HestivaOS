import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma.service';

const SIGNED_URL_TTL_SECONDS = 60;

@Injectable()
export class ExecutionEvidenceAccessService {
  private readonly storage: SupabaseClient | null;
  private readonly bucket: string;

  constructor(private readonly prisma: PrismaService) {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    this.bucket = process.env.SUPABASE_WORK_ORDER_PHOTOS_BUCKET?.trim() || 'work-order-photos';
    this.storage = url && serviceRoleKey
      ? createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  }

  async managementAccess(workOrderId: string, evidenceId: string, role: UserRole) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPERVISOR) throw new NotFoundException('Execution evidence was not found.');
    return this.sign(workOrderId, evidenceId);
  }

  async technicianAccess(userId: string, workOrderId: string, evidenceId: string) {
    const assigned = await this.prisma.employeeRecord.findFirst({
      where: { userId, status: 'ACTIVE', technician: { status: 'ACTIVE', workOrderAssignments: { some: { workOrderId } } } },
      select: { technicianId: true },
    });
    if (!assigned?.technicianId) throw new NotFoundException('Assigned execution evidence was not found.');
    return this.sign(workOrderId, evidenceId);
  }

  private async sign(workOrderId: string, evidenceId: string) {
    const evidence = await this.prisma.executionSectionEvidence.findFirst({
      where: { id: evidenceId, workOrderId },
      select: { id: true, storagePath: true, syncState: true },
    });
    if (!evidence) throw new NotFoundException('Execution evidence was not found.');
    if (evidence.syncState !== 'SERVER_ACKNOWLEDGED' || !evidence.storagePath) throw new ConflictException('Execution evidence has not finished uploading.');
    if (!this.storage) throw new ServiceUnavailableException('Private evidence access is not configured.');
    const { data, error } = await this.storage.storage.from(this.bucket).createSignedUrl(evidence.storagePath, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) throw new ServiceUnavailableException('Private evidence access is temporarily unavailable.');
    return { evidenceId: evidence.id, url: data.signedUrl, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() };
  }
}
