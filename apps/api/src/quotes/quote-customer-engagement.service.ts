import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import {
  QUOTE_CUSTOMER_ACCESS_SECURITY,
  QuoteCustomerAccessService,
} from './quote-customer-access.service';

const CHALLENGE_BYTES = 32;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CHALLENGE_LIFETIME_MS = 5 * 60 * 1000;
const MINIMUM_VISIBLE_DWELL_MS = 2_000;
const EVENT_TYPE_VIEW_CONFIRMED = 'VIEW_CONFIRMED';

const CUSTOMER_READABLE_STATUSES = new Set<QuoteStatus>([
  QuoteStatus.SUBMITTED,
  QuoteStatus.ACCEPTED,
  QuoteStatus.DECLINED,
]);

type GrantIdentityRow = {
  id: string;
  quote_id: string;
  revision_number: number;
  expires_at: Date;
};

type ChallengeConfirmationRow = {
  challenge_id: string;
  grant_id: string;
  quote_id: string;
  revision_number: number;
  issued_at: Date;
  challenge_expires_at: Date;
  confirmed_at: Date | null;
  event_id: string | null;
  grant_expires_at: Date;
  revoked_at: Date | null;
  superseded_at: Date | null;
  quote_status: QuoteStatus;
  current_revision_number: number;
  quote_valid_until: Date;
};

type EngagementEventRow = {
  id: string;
  occurred_at: Date;
};

type SummaryGrantRow = {
  id: string;
  revision_number: number;
  expires_at: Date;
  revoked_at: Date | null;
  superseded_at: Date | null;
  created_at: Date;
};

type SummaryAggregateRow = {
  first_viewed_at: Date | null;
  last_viewed_at: Date | null;
  view_count: bigint;
};

function fingerprint(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function unavailable(): NotFoundException {
  return new NotFoundException(QUOTE_CUSTOMER_ACCESS_SECURITY.unavailableMessage);
}

function isReadableStatus(status: QuoteStatus): boolean {
  return CUSTOMER_READABLE_STATUSES.has(status);
}

@Injectable()
export class QuoteCustomerEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: QuoteCustomerAccessService,
  ) {}

  private async resolveGrantIdentity(rawCapability: string): Promise<GrantIdentityRow> {
    const projection = await this.access.resolve(rawCapability);
    const rows = await this.prisma.$queryRaw<GrantIdentityRow[]>(Prisma.sql`
      SELECT id, quote_id, revision_number, expires_at
      FROM quote_customer_access_grants
      WHERE token_fingerprint = ${fingerprint(rawCapability)}
      LIMIT 1
    `);
    const grant = rows[0];
    if (!grant || grant.revision_number !== projection.quote.revisionNumber) throw unavailable();
    return grant;
  }

  async issueViewChallenge(rawCapability: string) {
    const grant = await this.resolveGrantIdentity(rawCapability);
    const now = new Date();
    const expiresAt = new Date(Math.min(now.getTime() + CHALLENGE_LIFETIME_MS, grant.expires_at.getTime()));
    if (expiresAt.getTime() <= now.getTime()) throw unavailable();
    const rawChallenge = randomBytes(CHALLENGE_BYTES).toString('base64url');
    const challengeFingerprint = fingerprint(rawChallenge);

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO quote_customer_view_challenges (
        id, grant_id, quote_id, revision_number, challenge_fingerprint, issued_at, expires_at
      ) VALUES (
        ${randomUUID()}::uuid,
        ${grant.id}::uuid,
        ${grant.quote_id}::uuid,
        ${grant.revision_number},
        ${challengeFingerprint},
        ${now},
        ${expiresAt}
      )
    `);

    return {
      challenge: rawChallenge,
      expiresAt: expiresAt.toISOString(),
      minimumVisibleDwellMs: MINIMUM_VISIBLE_DWELL_MS,
    };
  }

  async confirmView(rawCapability: string, rawChallenge: string, pageVisible: boolean) {
    if (pageVisible !== true) {
      throw new BadRequestException('View confirmation requires a visible page.');
    }
    if (!CHALLENGE_PATTERN.test(rawChallenge)) throw unavailable();

    const grant = await this.resolveGrantIdentity(rawCapability);
    const challengeFingerprint = fingerprint(rawChallenge);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ChallengeConfirmationRow[]>(Prisma.sql`
        SELECT
          c.id AS challenge_id,
          c.grant_id,
          c.quote_id,
          c.revision_number,
          c.issued_at,
          c.expires_at AS challenge_expires_at,
          c.confirmed_at,
          c.event_id,
          g.expires_at AS grant_expires_at,
          g.revoked_at,
          g.superseded_at,
          q.status AS quote_status,
          q.current_revision_number,
          q.valid_until AS quote_valid_until
        FROM quote_customer_view_challenges c
        JOIN quote_customer_access_grants g ON g.id = c.grant_id
        JOIN quotes q ON q.id = c.quote_id
        WHERE c.challenge_fingerprint = ${challengeFingerprint}
          AND c.grant_id = ${grant.id}::uuid
          AND c.quote_id = ${grant.quote_id}::uuid
          AND c.revision_number = ${grant.revision_number}
        LIMIT 1
        FOR UPDATE OF c, g, q
      `);
      const challenge = rows[0];
      if (!challenge) throw unavailable();

      if (
        challenge.challenge_expires_at.getTime() <= now.getTime()
        || challenge.grant_expires_at.getTime() <= now.getTime()
        || challenge.quote_valid_until.getTime() <= now.getTime()
        || challenge.revoked_at
        || challenge.superseded_at
        || challenge.current_revision_number !== challenge.revision_number
        || !isReadableStatus(challenge.quote_status)
      ) {
        throw unavailable();
      }

      if (challenge.confirmed_at && challenge.event_id) {
        const existing = await tx.$queryRaw<EngagementEventRow[]>(Prisma.sql`
          SELECT id, occurred_at
          FROM quote_customer_engagement_events
          WHERE id = ${challenge.event_id}::uuid
            AND event_type = ${EVENT_TYPE_VIEW_CONFIRMED}::"QuoteCustomerEngagementEventType"
          LIMIT 1
        `);
        const event = existing[0];
        if (!event) throw unavailable();
        return {
          eventType: EVENT_TYPE_VIEW_CONFIRMED,
          occurredAt: event.occurred_at.toISOString(),
          replayed: true,
        };
      }

      if (now.getTime() - challenge.issued_at.getTime() < MINIMUM_VISIBLE_DWELL_MS) {
        throw new ConflictException('Quote view confirmation is not yet eligible.');
      }

      const eventId = randomUUID();
      const idempotencyKey = `view-challenge:${challenge.challenge_id}`;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO quote_customer_engagement_events (
          id, grant_id, quote_id, revision_number, event_type, idempotency_key, occurred_at, metadata, created_at
        ) VALUES (
          ${eventId}::uuid,
          ${challenge.grant_id}::uuid,
          ${challenge.quote_id}::uuid,
          ${challenge.revision_number},
          ${EVENT_TYPE_VIEW_CONFIRMED}::"QuoteCustomerEngagementEventType",
          ${idempotencyKey},
          ${now},
          ${JSON.stringify({ protocol: 'visible-dwell-v1' })}::jsonb,
          ${now}
        )
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE quote_customer_view_challenges
        SET confirmed_at = ${now}, event_id = ${eventId}::uuid
        WHERE id = ${challenge.challenge_id}::uuid
          AND confirmed_at IS NULL
          AND event_id IS NULL
      `);

      return {
        eventType: EVENT_TYPE_VIEW_CONFIRMED,
        occurredAt: now.toISOString(),
        replayed: false,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async engagementSummary(quoteId: string, expectedRevisionNumber: number) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        currentRevisionNumber: true,
        validUntil: true,
        status: true,
        revisions: {
          where: { revisionNumber: expectedRevisionNumber },
          select: { revisionNumber: true },
          take: 1,
        },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found.');
    if (!quote.revisions[0]) throw new ConflictException('Requested Quote revision does not exist.');

    const grants = await this.prisma.$queryRaw<SummaryGrantRow[]>(Prisma.sql`
      SELECT id, revision_number, expires_at, revoked_at, superseded_at, created_at
      FROM quote_customer_access_grants
      WHERE quote_id = ${quoteId}::uuid
        AND revision_number = ${expectedRevisionNumber}
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const aggregate = await this.prisma.$queryRaw<SummaryAggregateRow[]>(Prisma.sql`
      SELECT
        MIN(occurred_at) AS first_viewed_at,
        MAX(occurred_at) AS last_viewed_at,
        COUNT(*)::bigint AS view_count
      FROM quote_customer_engagement_events
      WHERE quote_id = ${quoteId}::uuid
        AND revision_number = ${expectedRevisionNumber}
        AND event_type = ${EVENT_TYPE_VIEW_CONFIRMED}::"QuoteCustomerEngagementEventType"
    `);

    const grant = grants[0];
    const views = aggregate[0] ?? { first_viewed_at: null, last_viewed_at: null, view_count: 0n };
    const now = Date.now();
    let accessState = 'NONE';
    if (grant) {
      if (grant.revoked_at) accessState = 'REVOKED';
      else if (grant.superseded_at) accessState = 'SUPERSEDED';
      else if (quote.currentRevisionNumber !== expectedRevisionNumber) accessState = 'STALE_REVISION';
      else if (grant.expires_at.getTime() <= now || quote.validUntil.getTime() <= now) accessState = 'EXPIRED';
      else if (!isReadableStatus(quote.status)) accessState = 'QUOTE_UNAVAILABLE';
      else accessState = 'ACTIVE';
    }

    return {
      revisionNumber: expectedRevisionNumber,
      accessState,
      firstViewedAt: views.first_viewed_at?.toISOString() ?? null,
      lastViewedAt: views.last_viewed_at?.toISOString() ?? null,
      viewCount: Number(views.view_count),
    };
  }
}

export const QUOTE_CUSTOMER_VIEW_SECURITY = {
  challengeBytes: CHALLENGE_BYTES,
  challengePattern: CHALLENGE_PATTERN,
  challengeLifetimeMs: CHALLENGE_LIFETIME_MS,
  minimumVisibleDwellMs: MINIMUM_VISIBLE_DWELL_MS,
  eventType: EVENT_TYPE_VIEW_CONFIRMED,
} as const;
