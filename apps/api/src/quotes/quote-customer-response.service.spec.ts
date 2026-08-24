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

function harness(preflightReady = true) {
  let query = 0;
  const tx = {
    $queryRaw: jest.fn(async () => {
      query += 1;
      if (query === 1) return [current()];
      if (query === 2) return [];
      if (query === 3) return [];
      return [];
    }),
    $executeRaw: jest.fn(async () => 1),
  };
  const prisma = {
    $queryRaw: jest.fn(async () => [{ id: GRANT, quote_id: QUOTE, revision_number: 2, expires_at: new Date(Date.now() + 60_000) }]),
    $transaction: jest.fn(async (fn: (value: typeof tx) => unknown) => fn(tx)),
    quote: { findUnique: jest.fn(async () => ({ status: QuoteStatus.SUBMITTED })) },
  } as unknown as PrismaService;
  const review = {
    preflight: jest.fn(async () => ({ eligibleForAcceptance: preflightReady, blockers: preflightReady ? [] : [{ code: 'CUSTOMER_UNRESOLVED' }] })),
    accept: jest.fn(async () => ({ status: QuoteStatus.ACCEPTED })),
    decline: jest.fn(async () => ({ status: QuoteStatus.DECLINED })),
  } as unknown as QuoteReviewService;
  return { service: new QuoteCustomerResponseService(prisma, access(), review), review, tx };
}

describe('QuoteCustomerResponseService', () => {
  it('records customer acceptance separately then converts through canonical acceptance using only the reserved system actor', async () => {
    const { service, review, tx } = harness(true);
    const result = await service.respond(CAP, 'CUSTOMER_ACCEPTED', 'accept-0001', true);
    expect(result.state).toBe('CONVERTED');
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(review.accept).toHaveBeenCalledWith(QUOTE, { expectedRevisionNumber: 2 }, CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.userId);
    expect(CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.actorKind).toBe('CUSTOMER_SELF_SERVICE');
  });

  it('preserves customer acceptance when canonical preflight requires internal completion', async () => {
    const { service, review, tx } = harness(false);
    const result = await service.respond(CAP, 'CUSTOMER_ACCEPTED', 'accept-0002', true);
    expect(result.state).toBe('PENDING_INTERNAL_COMPLETION');
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(review.accept).not.toHaveBeenCalled();
  });

  it('routes decline through canonical decline authority with the reserved execution actor', async () => {
    const { service, review } = harness(true);
    const result = await service.respond(CAP, 'CUSTOMER_DECLINED', 'decline-001', true);
    expect(result.state).toBe('DECLINED');
    expect(review.decline).toHaveBeenCalledWith(QUOTE, { expectedRevisionNumber: 2 }, CUSTOMER_SELF_SERVICE_SYSTEM_ACTOR.userId);
    expect(review.accept).not.toHaveBeenCalled();
  });
});
