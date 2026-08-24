import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { QuoteStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import type { QuoteCustomerAccessService } from './quote-customer-access.service';
import type { QuoteReviewService } from './quote-review.service';
import { CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR } from './quote-customer-response.constants';
import { QuoteCustomerResponseService } from './quote-customer-response.service';

const CAP = 'A'.repeat(43);
const GRANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const QUOTE = '11111111-1111-4111-8111-111111111111';

function access() { return { resolve: jest.fn(async () => ({ quote: { revisionNumber: 2 } })) } as unknown as QuoteCustomerAccessService; }
function current() { return { id: GRANT, quote_id: QUOTE, revision_number: 2, expires_at: new Date(Date.now() + 60_000), revoked_at: null, superseded_at: null, quote_status: QuoteStatus.SUBMITTED, current_revision_number: 2, valid_until: new Date(Date.now() + 60_000) }; }

type HarnessOptions = {
  preflights?: Array<{ eligibleForAcceptance: boolean; blockers: Array<{ code: string }> }>;
  acceptResults?: Array<'SUCCESS' | Error>;
  declineResults?: Array<'SUCCESS' | Error>;
  quoteStatuses?: QuoteStatus[];
};

function harness(options: HarnessOptions = {}) {
  let responsePersisted = false;
  let storedDecision: 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DECLINED' | null = null;
  let storedKey: string | null = null;
  const eventId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const occurredAt = new Date('2026-08-24T10:00:00.000Z');
  const transactionWrites: unknown[][] = [];

  const prisma = {
    $queryRaw: jest.fn(async () => [{ id: GRANT, quote_id: QUOTE, revision_number: 2, expires_at: new Date(Date.now() + 60_000) }]),
    $transaction: jest.fn(async (fn: (value: { $queryRaw: jest.Mock; $executeRaw: jest.Mock }) => unknown) => {
      let query = 0;
      const writes: unknown[] = [];
      const tx = {
        $queryRaw: jest.fn(async () => {
          query += 1;
          if (query === 1) return [current()];
          if (query === 2) return responsePersisted && storedDecision ? [{ decision: storedDecision, event_id: eventId, created_at: occurredAt }] : [];
          if (query === 3) return responsePersisted && storedDecision && storedKey ? [{ grant_id: GRANT, decision: storedDecision, event_id: eventId, created_at: occurredAt }] : [];
          return [];
        }),
        $executeRaw: jest.fn(async (statement: unknown) => {
          writes.push(statement);
          if (writes.length === 2) responsePersisted = true;
          return 1;
        }),
      };
      transactionWrites.push(writes);
      const result = await fn(tx);
      if (!responsePersisted && writes.length === 2) responsePersisted = true;
      return result;
    }),
    quote: {
      findUnique: jest.fn(async () => ({ status: options.quoteStatuses?.shift() ?? QuoteStatus.SUBMITTED })),
    },
  } as unknown as PrismaService;

  const preflights = options.preflights ?? [{ eligibleForAcceptance: true, blockers: [] }];
  const acceptResults = options.acceptResults ?? ['SUCCESS'];
  const declineResults = options.declineResults ?? ['SUCCESS'];
  const review = {
    preflight: jest.fn(async () => preflights.shift() ?? { eligibleForAcceptance: true, blockers: [] }),
    accept: jest.fn(async () => {
      const result = acceptResults.shift() ?? 'SUCCESS';
      if (result instanceof Error) throw result;
      return { status: QuoteStatus.ACCEPTED };
    }),
    decline: jest.fn(async () => {
      const result = declineResults.shift() ?? 'SUCCESS';
      if (result instanceof Error) throw result;
      return { status: QuoteStatus.DECLINED };
    }),
  } as unknown as QuoteReviewService;

  const service = new QuoteCustomerResponseService(prisma, access(), review);
  const respond = async (decision: 'CUSTOMER_ACCEPTED' | 'CUSTOMER_DECLINED', key: string) => {
    storedDecision ??= decision;
    storedKey ??= key;
    return service.respond(CAP, decision, key, true);
  };
  return { service, respond, review, prisma, transactionWrites, evidencePersisted: () => responsePersisted };
}

describe('QuoteCustomerResponseService', () => {
  it('records customer acceptance separately then converts through canonical acceptance using only the reserved system actor', async () => {
    const h = harness();
    const result = await h.respond('CUSTOMER_ACCEPTED', 'accept-0001');
    expect(result.state).toBe('CONVERTED');
    expect(h.evidencePersisted()).toBe(true);
    expect(h.review.accept).toHaveBeenCalledWith(QUOTE, { expectedRevisionNumber: 2 }, CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.userId);
    expect(CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.actorKind).toBe('CUSTOMER_SELF_SERVICE');
  });

  it('preserves customer acceptance when canonical preflight requires internal completion', async () => {
    const h = harness({ preflights: [{ eligibleForAcceptance: false, blockers: [{ code: 'CUSTOMER_UNRESOLVED' }] }] });
    const result = await h.respond('CUSTOMER_ACCEPTED', 'accept-0002');
    expect(result.state).toBe('PENDING_INTERNAL_COMPLETION');
    expect(result.blockers).toEqual([{ code: 'CUSTOMER_UNRESOLVED' }]);
    expect(h.evidencePersisted()).toBe(true);
    expect(h.review.accept).not.toHaveBeenCalled();
  });

  it('does not disguise an unexpected canonical accept failure as pending business state or expose its sensitive text', async () => {
    const h = harness({ acceptResults: [new Error('database password=do-not-expose')] });
    const promise = h.respond('CUSTOMER_ACCEPTED', 'accept-0003');
    await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(promise).rejects.not.toThrow('database password=do-not-expose');
    expect(h.evidencePersisted()).toBe(true);
  });

  it('reuses durable acceptance evidence after a transient conversion failure and can complete on retry', async () => {
    const h = harness({ acceptResults: [new Error('temporary database outage'), 'SUCCESS'] });
    await expect(h.respond('CUSTOMER_ACCEPTED', 'accept-0004')).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(h.evidencePersisted()).toBe(true);
    const retry = await h.respond('CUSTOMER_ACCEPTED', 'accept-0004');
    expect(retry.state).toBe('CONVERTED');
    expect(retry.replayed).toBe(true);
    expect(h.transactionWrites[1]).toHaveLength(0);
    expect(h.review.accept).toHaveBeenCalledTimes(2);
  });

  it('turns a canonical conflict into pending only when a fresh preflight proves a business blocker', async () => {
    const h = harness({
      acceptResults: [new ConflictException('Quote decision changed concurrently.')],
      preflights: [
        { eligibleForAcceptance: true, blockers: [] },
        { eligibleForAcceptance: false, blockers: [{ code: 'CUSTOMER_UNRESOLVED' }] },
      ],
    });
    const result = await h.respond('CUSTOMER_ACCEPTED', 'accept-0005');
    expect(result.state).toBe('PENDING_INTERNAL_COMPLETION');
    expect(result.blockers).toEqual([{ code: 'CUSTOMER_UNRESOLVED' }]);
  });

  it('converges an acceptance race through the canonical already-accepted replay path without duplicate response evidence', async () => {
    const h = harness({
      acceptResults: [new ConflictException('Quote decision changed concurrently.'), 'SUCCESS'],
      preflights: [
        { eligibleForAcceptance: true, blockers: [] },
        { eligibleForAcceptance: false, blockers: [{ code: 'ALREADY_ACCEPTED' }] },
      ],
    });
    const result = await h.respond('CUSTOMER_ACCEPTED', 'accept-0006');
    expect(result.state).toBe('CONVERTED');
    expect(h.review.accept).toHaveBeenCalledTimes(2);
    expect(h.transactionWrites).toHaveLength(1);
    expect(h.transactionWrites[0]).toHaveLength(2);
  });

  it('does not convert an unexplained canonical conflict into ordinary pending state', async () => {
    const conflict = new ConflictException('Canonical invariant mismatch.');
    const h = harness({ acceptResults: [conflict], preflights: [{ eligibleForAcceptance: true, blockers: [] }, { eligibleForAcceptance: true, blockers: [] }] });
    await expect(h.respond('CUSTOMER_ACCEPTED', 'accept-0007')).rejects.toBe(conflict);
    expect(h.evidencePersisted()).toBe(true);
  });

  it('routes decline through canonical authority with the reserved execution actor', async () => {
    const h = harness();
    const result = await h.respond('CUSTOMER_DECLINED', 'decline-001');
    expect(result.state).toBe('DECLINED');
    expect(h.review.decline).toHaveBeenCalledWith(QUOTE, { expectedRevisionNumber: 2 }, CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.userId);
    expect(h.review.accept).not.toHaveBeenCalled();
  });

  it('preserves decline evidence but reports an unexpected canonical decline failure as an internal failure', async () => {
    const h = harness({ declineResults: [new Error('private decline failure')] });
    const promise = h.respond('CUSTOMER_DECLINED', 'decline-002');
    await expect(promise).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(promise).rejects.not.toThrow('private decline failure');
    expect(h.evidencePersisted()).toBe(true);
  });

  it('replays decline evidence and safely retries canonical decline after a transient failure', async () => {
    const h = harness({ declineResults: [new Error('temporary decline outage'), 'SUCCESS'] });
    await expect(h.respond('CUSTOMER_DECLINED', 'decline-003')).rejects.toBeInstanceOf(InternalServerErrorException);
    const retry = await h.respond('CUSTOMER_DECLINED', 'decline-003');
    expect(retry.state).toBe('DECLINED');
    expect(retry.replayed).toBe(true);
    expect(h.review.decline).toHaveBeenCalledTimes(2);
    expect(h.transactionWrites[1]).toHaveLength(0);
  });

  it('does not falsely report DECLINED when canonical decline reports a concurrent incompatible decision', async () => {
    const conflict = new ConflictException('Quote decision changed concurrently.');
    const h = harness({ declineResults: [conflict] });
    await expect(h.respond('CUSTOMER_DECLINED', 'decline-004')).rejects.toBe(conflict);
    expect(h.evidencePersisted()).toBe(true);
  });
});
