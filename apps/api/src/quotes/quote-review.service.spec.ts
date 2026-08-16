import { ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { QuoteActivityType, QuoteEntityResolution, QuoteStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import { QuoteReviewService } from './quote-review.service';

const revision = { id: 'revision-1', quoteId: 'quote-1', revisionNumber: 2, structuredData: { customer: { fullName: 'Alex', email: 'alex@example.com', mobile: '+27821234567' }, property: { addressLine1: '1 Main Road', suburb: 'Durban', country: 'South Africa' }, request: {} }, lineItems: [{ sortOrder: 0 }] };
const baseQuote: any = {
  id: 'quote-1', reference: 'Q-20260815-0001', status: QuoteStatus.SUBMITTED, currentRevisionNumber: 2,
  validUntil: new Date('2099-01-01'), acceptedAt: null, acceptedByUserId: null, acceptedRevisionId: null,
  declinedAt: null, declinedByUserId: null, customerId: null, propertyId: null, workOrderId: null,
  recurringAgreementId: null, photos: [], activities: [], acceptedRevision: null,
  customerResolution: null, propertyResolution: null, resolutionRevisionNumber: null,
};

const matchRepos = { customer: { findMany: jest.fn(async () => []) }, property: { findMany: jest.fn(async () => []) } };

describe('QuoteReviewService review reads', () => {
  it('lists Quotes with repository pagination conventions', async () => {
    const prisma = { quote: { findMany: jest.fn(), count: jest.fn() }, $transaction: jest.fn(async () => [[baseQuote], 1]) } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).findAll(1, 20, 'Q-', QuoteStatus.SUBMITTED);
    expect(result).toEqual({ items: [baseQuote], total: 1, page: 1, pageSize: 20 });
  });

  it('returns the exact current revision with line items and activities', async () => {
    const prisma = { quote: { findUnique: jest.fn(async () => baseQuote) }, quoteRevision: { findUnique: jest.fn(async () => revision) }, ...matchRepos } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).findOne('quote-1');
    expect(result.currentRevision).toBe(revision);
    expect(result.activities).toEqual([]);
    expect(prisma.quoteRevision.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { quoteId_revisionNumber: { quoteId: 'quote-1', revisionNumber: 2 } } }));
  });

  it('preflight is non-mutating and reports deterministic and deferred blockers', async () => {
    const needsAttention = { ...baseQuote, status: QuoteStatus.NEEDS_ATTENTION };
    const prisma = { quote: { findUnique: jest.fn(async () => needsAttention) }, quoteRevision: { findUnique: jest.fn(async () => revision) }, ...matchRepos } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).preflight('quote-1', 2);
    expect(result.eligibleForAcceptance).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(['NEEDS_ATTENTION', 'OPERATIONAL_CONVERSION_NOT_IMPLEMENTED']));
    expect(result.resolution).toEqual({ customer: expect.objectContaining({ state: 'NO_MATCH_NEW_CANDIDATE', readiness: 'READY' }), property: expect.objectContaining({ state: 'NO_MATCH_NEW_CANDIDATE', readiness: 'READY' }) });
    expect(prisma.quote.update).toBeUndefined();
  });

  it('reports a stale expected revision without mutating the Quote', async () => {
    const prisma = { quote: { findUnique: jest.fn(async () => baseQuote) }, quoteRevision: { findUnique: jest.fn(async () => revision) }, ...matchRepos } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).preflight('quote-1', 1);
    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'STALE_REVISION' })]));
  });
});

function declineHarness(quote = baseQuote, updateCount = 1) {
  const tx = {
    quote: {
      findUnique: jest.fn(async () => quote),
      updateMany: jest.fn(async () => ({ count: updateCount })),
      findUniqueOrThrow: jest.fn(async () => ({ ...quote, status: QuoteStatus.DECLINED })),
    },
    quoteActivity: { create: jest.fn(async () => ({})) },
  };
  const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaService;
  return { service: new QuoteReviewService(prisma), tx, prisma };
}

describe('QuoteReviewService decline transition', () => {
  it('atomically records status, actor, reason, revision and status-change activity', async () => {
    const { service, tx, prisma } = declineHarness();
    await service.decline('quote-1', { expectedRevisionNumber: 2, reason: '  Customer declined  ' }, 'admin-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: QuoteStatus.DECLINED, declinedByUserId: 'admin-1' }) }));
    expect(tx.quoteActivity.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: QuoteActivityType.STATUS_CHANGED, previousStatus: QuoteStatus.SUBMITTED, newStatus: QuoteStatus.DECLINED, actorUserId: 'admin-1', note: 'Customer declined', metadata: { expectedRevisionNumber: 2 } }) });
  });

  it('rejects a stale revision', async () => {
    const { service, tx } = declineHarness();
    await expect(service.decline('quote-1', { expectedRevisionNumber: 1 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it('returns an identical decline retry without writing another activity', async () => {
    const declined = { ...baseQuote, status: QuoteStatus.DECLINED, declinedByUserId: 'admin-1', activities: [{ note: 'No longer needed', metadata: { expectedRevisionNumber: 2 } }] };
    const { service, tx } = declineHarness(declined);
    await expect(service.decline('quote-1', { expectedRevisionNumber: 2, reason: 'No longer needed' }, 'admin-1')).resolves.toBe(declined);
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
    expect(tx.quoteActivity.create).not.toHaveBeenCalled();
  });

  it('rejects a conflicting repeated decline and keeps DECLINED terminal', async () => {
    const declined = { ...baseQuote, status: QuoteStatus.DECLINED, declinedByUserId: 'admin-1', activities: [{ note: 'First reason', metadata: { expectedRevisionNumber: 2 } }] };
    const { service } = declineHarness(declined);
    await expect(service.decline('quote-1', { expectedRevisionNumber: 2, reason: 'Different reason' }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([QuoteStatus.ACCEPTED, QuoteStatus.EXPIRED])('does not overwrite incompatible %s state', async (status) => {
    const { service, tx } = declineHarness({ ...baseQuote, status });
    await expect(service.decline('quote-1', { expectedRevisionNumber: 2 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.quote.updateMany).not.toHaveBeenCalled();
  });

  it('fails closed when a concurrent transition wins', async () => {
    const { service } = declineHarness(baseQuote, 0);
    await expect(service.decline('quote-1', { expectedRevisionNumber: 2 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('QuoteReviewService durable match resolution', () => {
  const input = { expectedRevisionNumber: 2, customer: { decision: QuoteEntityResolution.CREATE_NEW }, property: { decision: QuoteEntityResolution.CREATE_NEW } };
  function harness(quote = baseQuote, updateCount = 1) {
    const tx = { quote: { findUnique: jest.fn(async () => quote), updateMany: jest.fn(async () => ({ count: updateCount })), findUniqueOrThrow: jest.fn(async () => quote) }, customer: { findUnique: jest.fn() }, property: { findUnique: jest.fn() }, quoteActivity: { create: jest.fn(async () => ({})) } };
    const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaService;
    return { service: new QuoteReviewService(prisma), tx };
  }

  it('records an audited explicit create decision without creating operational records', async () => {
    const { service, tx } = harness();
    await service.recordResolution('quote-1', input, 'admin-1');
    expect(tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerResolution: QuoteEntityResolution.CREATE_NEW, propertyResolution: QuoteEntityResolution.CREATE_NEW }) }));
    expect(tx.quoteActivity.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: QuoteActivityType.MATCH_RESOLUTION_RECORDED, actorUserId: 'admin-1' }) });
    expect((tx as any).workOrder).toBeUndefined();
  });

  it('rejects stale and concurrent decisions', async () => {
    await expect(harness().service.recordResolution('quote-1', { ...input, expectedRevisionNumber: 1 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    await expect(harness(baseQuote, 0).service.recordResolution('quote-1', input, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('makes an identical retry safe and rejects a conflicting retry', async () => {
    const resolved = { ...baseQuote, customerResolution: QuoteEntityResolution.CREATE_NEW, propertyResolution: QuoteEntityResolution.CREATE_NEW, resolutionRevisionNumber: 2 };
    const identical = harness(resolved);
    await expect(identical.service.recordResolution('quote-1', input, 'admin-1')).resolves.toBe(resolved);
    expect(identical.tx.quoteActivity.create).not.toHaveBeenCalled();
    await expect(harness(resolved).service.recordResolution('quote-1', { ...input, customer: { decision: QuoteEntityResolution.USE_EXISTING, customerId: 'customer-1' } }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });
});
