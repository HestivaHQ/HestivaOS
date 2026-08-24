import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { QuoteCustomerAccessService, QUOTE_CUSTOMER_ACCESS_SECURITY } from './quote-customer-access.service';
import { QuoteReviewService } from './quote-review.service';
import { CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR } from './quote-customer-response.constants';

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const ACCEPTED = 'CUSTOMER_ACCEPTED';
const DECLINED = 'CUSTOMER_DECLINED';
type Decision = typeof ACCEPTED | typeof DECLINED;

type GrantRow = { id: string; quote_id: string; revision_number: number; expires_at: Date };
type ExistingResponse = { decision: Decision; event_id: string; created_at: Date };

function fingerprint(value: string) { return createHash('sha256').update(value, 'utf8').digest('hex'); }
function unavailable() { return new NotFoundException(QUOTE_CUSTOMER_ACCESS_SECURITY.unavailableMessage); }

@Injectable()
export class QuoteCustomerResponseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: QuoteCustomerAccessService,
    private readonly review: QuoteReviewService,
  ) {}

  private async grant(rawCapability: string): Promise<GrantRow> {
    const projection = await this.access.resolve(rawCapability);
    const rows = await this.prisma.$queryRaw<GrantRow[]>(Prisma.sql`
      SELECT id, quote_id, revision_number, expires_at
      FROM quote_customer_access_grants
      WHERE token_fingerprint = ${fingerprint(rawCapability)}
      LIMIT 1
    `);
    const grant = rows[0];
    if (!grant || grant.revision_number !== projection.quote.revisionNumber) throw unavailable();
    return grant;
  }

  async respond(rawCapability: string, decision: Decision, idempotencyKey: string, confirmed: boolean) {
    if (confirmed !== true) throw new BadRequestException('Customer response requires explicit confirmation.');
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) throw new BadRequestException('A valid idempotency key is required.');
    if (decision !== ACCEPTED && decision !== DECLINED) throw new BadRequestException('Customer response decision is invalid.');
    const grant = await this.grant(rawCapability);

    const evidence = await this.prisma.$transaction(async (tx) => {
      const state = await tx.$queryRaw<Array<GrantRow & { revoked_at: Date | null; superseded_at: Date | null; quote_status: QuoteStatus; current_revision_number: number; valid_until: Date }>>(Prisma.sql`
        SELECT g.id, g.quote_id, g.revision_number, g.expires_at, g.revoked_at, g.superseded_at,
               q.status AS quote_status, q.current_revision_number, q.valid_until
        FROM quote_customer_access_grants g JOIN quotes q ON q.id = g.quote_id
        WHERE g.id = ${grant.id}::uuid LIMIT 1 FOR UPDATE OF g, q
      `);
      const current = state[0];
      const now = new Date();
      if (!current || current.revoked_at || current.superseded_at || current.expires_at <= now || current.valid_until <= now || current.current_revision_number !== current.revision_number) throw unavailable();

      const prior = await tx.$queryRaw<ExistingResponse[]>(Prisma.sql`
        SELECT decision, event_id, created_at FROM quote_customer_responses
        WHERE grant_id = ${grant.id}::uuid ORDER BY created_at ASC LIMIT 1
      `);
      if (prior[0]) {
        if (prior[0].decision !== decision) throw new ConflictException('This Quote already has a different customer response.');
        return { eventId: prior[0].event_id, occurredAt: prior[0].created_at, replayed: true };
      }

      const byKey = await tx.$queryRaw<Array<ExistingResponse & { grant_id: string }>>(Prisma.sql`
        SELECT grant_id, decision, event_id, created_at FROM quote_customer_responses
        WHERE idempotency_key = ${idempotencyKey} LIMIT 1
      `);
      if (byKey[0]) {
        if (byKey[0].grant_id !== grant.id || byKey[0].decision !== decision) throw new ConflictException('Idempotency key is already in use.');
        return { eventId: byKey[0].event_id, occurredAt: byKey[0].created_at, replayed: true };
      }

      if (decision === DECLINED && current.quote_status !== QuoteStatus.SUBMITTED && current.quote_status !== QuoteStatus.NEEDS_ATTENTION) throw new ConflictException(`${current.quote_status} Quote cannot be declined.`);
      if (decision === ACCEPTED && current.quote_status !== QuoteStatus.SUBMITTED) throw new ConflictException(`${current.quote_status} Quote cannot be accepted.`);

      const eventId = randomUUID();
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO quote_customer_engagement_events (id, grant_id, quote_id, revision_number, event_type, idempotency_key, occurred_at, metadata, created_at)
        VALUES (${eventId}::uuid, ${grant.id}::uuid, ${grant.quote_id}::uuid, ${grant.revision_number}, ${decision}::"QuoteCustomerEngagementEventType",
          ${`customer-response:${idempotencyKey}`}, ${now}, ${JSON.stringify({ source: CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.source })}::jsonb, ${now})
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO quote_customer_responses (id, grant_id, quote_id, revision_number, decision, idempotency_key, event_id, created_at)
        VALUES (${randomUUID()}::uuid, ${grant.id}::uuid, ${grant.quote_id}::uuid, ${grant.revision_number}, ${decision}::"QuoteCustomerEngagementEventType", ${idempotencyKey}, ${eventId}::uuid, ${now})
      `);
      return { eventId, occurredAt: now, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (decision === DECLINED) {
      const quote = await this.prisma.quote.findUnique({ where: { id: grant.quote_id }, select: { status: true } });
      if (quote?.status !== QuoteStatus.DECLINED) {
        await this.review.decline(grant.quote_id, { expectedRevisionNumber: grant.revision_number }, CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.userId);
      }
      return { decision, state: 'DECLINED', revisionNumber: grant.revision_number, ...evidence };
    }

    const quote = await this.prisma.quote.findUnique({ where: { id: grant.quote_id }, select: { status: true } });
    if (quote?.status === QuoteStatus.ACCEPTED) return { decision, state: 'CONVERTED', revisionNumber: grant.revision_number, ...evidence };

    const preflight = await this.review.preflight(grant.quote_id, grant.revision_number);
    if (!preflight.eligibleForAcceptance) {
      return { decision, state: 'PENDING_INTERNAL_COMPLETION', revisionNumber: grant.revision_number, blockers: preflight.blockers, ...evidence };
    }
    try {
      await this.review.accept(grant.quote_id, { expectedRevisionNumber: grant.revision_number }, CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.userId);
      return { decision, state: 'CONVERTED', revisionNumber: grant.revision_number, ...evidence };
    } catch (error) {
      return { decision, state: 'PENDING_INTERNAL_COMPLETION', revisionNumber: grant.revision_number, blockers: [{ code: 'CONVERSION_REQUIRES_ATTENTION', message: error instanceof Error ? error.message : 'Canonical conversion requires internal completion.' }], ...evidence };
    }
  }

  async summary(quoteId: string, expectedRevisionNumber: number) {
    const rows = await this.prisma.$queryRaw<Array<{ decision: Decision; created_at: Date; metadata: Prisma.JsonValue }>>(Prisma.sql`
      SELECT r.decision, r.created_at, e.metadata FROM quote_customer_responses r
      JOIN quote_customer_engagement_events e ON e.id = r.event_id
      WHERE r.quote_id = ${quoteId}::uuid AND r.revision_number = ${expectedRevisionNumber}
      ORDER BY r.created_at ASC
    `);
    return { revisionNumber: expectedRevisionNumber, response: rows[0] ? { decision: rows[0].decision, respondedAt: rows[0].created_at.toISOString(), source: 'PUBLIC_QUOTE_CAPABILITY' } : null };
  }
}

export const QUOTE_CUSTOMER_RESPONSE_SECURITY = { idempotencyPattern: IDEMPOTENCY_PATTERN, decisions: [ACCEPTED, DECLINED] as const };
