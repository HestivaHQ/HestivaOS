import { ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { QuoteActivityType, QuoteEntityResolution, QuoteStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import { QuoteReviewService } from './quote-review.service';

const revision = { id: 'revision-1', quoteId: 'quote-1', revisionNumber: 2, structuredData: { submittedAt: '2026-08-15T10:00:00.000Z', customer: { fullName: 'Alex', email: 'alex@example.com', mobile: '+27821234567' }, property: { addressLine1: '1 Main Road', suburb: 'Durban', country: 'South Africa' }, request: { primaryService: { canonicalService: 'Regular Home Cleaning', websiteValue: 'Regular Home Cleaning' }, frequency: 'ONE_TIME' }, visit: { preferredDate: '2026-08-20' } }, lineItems: [{ sortOrder: 0 }] };
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
    const prisma = { quote: { findMany: jest.fn(), count: jest.fn() }, quoteRevision: { findMany: jest.fn(async () => [{ quoteId: 'quote-1', structuredData: revision.structuredData }]) }, $transaction: jest.fn(async () => [[baseQuote], 1]) } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).findAll(1, 20, 'Q-', QuoteStatus.SUBMITTED);
    expect(result.items[0]).toEqual(expect.objectContaining({ id: 'quote-1', summary: expect.objectContaining({ customerName: 'Alex' }) }));
    expect(result.total).toBe(1);
  });

  it('returns the exact current revision with line items and activities', async () => {
    const prisma = { quote: { findUnique: jest.fn(async () => baseQuote) }, quoteRevision: { findUnique: jest.fn(async () => revision) }, user: { findMany: jest.fn(async () => []) }, ...matchRepos } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).findOne('quote-1');
    expect(result.currentRevision).toBe(revision);
    expect(result.activities).toEqual([]);
    expect(prisma.quoteRevision.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { quoteId_revisionNumber: { quoteId: 'quote-1', revisionNumber: 2 } } }));
  });

  it('preflight is non-mutating and reports deterministic blockers', async () => {
    const needsAttention = { ...baseQuote, status: QuoteStatus.NEEDS_ATTENTION };
    const prisma = { quote: { findUnique: jest.fn(async () => needsAttention) }, quoteRevision: { findUnique: jest.fn(async () => revision) }, ...matchRepos } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).preflight('quote-1', 2);
    expect(result.eligibleForAcceptance).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(['NEEDS_ATTENTION', 'CUSTOMER_UNRESOLVED', 'PROPERTY_UNRESOLVED']));
    expect(result.resolution).toEqual({ customer: expect.objectContaining({ state: 'NO_MATCH_NEW_CANDIDATE', readiness: 'READY' }), property: expect.objectContaining({ state: 'NO_MATCH_NEW_CANDIDATE', readiness: 'READY' }) });
    expect(prisma.quote.update).toBeUndefined();
  });

  it('reports a stale expected revision without mutating the Quote', async () => {
    const prisma = { quote: { findUnique: jest.fn(async () => baseQuote) }, quoteRevision: { findUnique: jest.fn(async () => revision) }, ...matchRepos } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).preflight('quote-1', 1);
    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'STALE_REVISION' })]));
  });

  it('reports a resolved supported ONE_TIME Quote ready', async () => {
    const readyRevision = { ...revision, structuredData: {
      customer: { fullName: 'Alex', email: 'alex@example.com', mobile: '+27821234567' },
      property: { propertyType: 'HOUSE', addressLine1: '1 Main Road', suburb: 'Durban', country: 'South Africa', floorSize: 'FROM_80_TO_99', bedrooms: 'THREE', bathrooms: 'TWO', livingAreas: 'ONE', outdoorArea: 'NONE', estateClassification: 'NONE' },
      request: { primaryService: { canonicalService: 'Regular Home Cleaning' }, frequency: 'ONE_TIME', homeCondition: 'STANDARD', addOns: [] },
      visit: { preferredDate: '2098-01-01', preferredTime: 'MORNING' }, household: { hasPets: false }, safety: {}, notes: {},
    } };
    const readyQuote = { ...baseQuote, customerResolution: QuoteEntityResolution.CREATE_NEW, propertyResolution: QuoteEntityResolution.CREATE_NEW, resolutionRevisionNumber: 2 };
    const prisma = { quote: { findUnique: jest.fn(async () => readyQuote) }, quoteRevision: { findUnique: jest.fn(async () => readyRevision) }, ...matchRepos } as unknown as PrismaService;
    const result = await new QuoteReviewService(prisma).preflight('quote-1', 2, new Date('2026-08-16'));
    expect(result.eligibleForAcceptance).toBe(true);
    expect(result.blockers).toEqual([]);
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

describe('QuoteReviewService atomic ONE_TIME acceptance', () => {
  const acceptedSubmission: any = {
    schemaVersion: '2.0', customer: { fullName: 'Alex', email: 'alex@example.com', mobile: '+27821234567' },
    property: { propertyType: 'HOUSE', addressLine1: '1 Main Road', suburb: 'Durban', country: 'South Africa', floorSize: 'FROM_80_TO_99', bedrooms: 'THREE', bathrooms: 'TWO', livingAreas: 'ONE', outdoorArea: 'NONE', estateClassification: 'NONE', exactFloor: 4, buildingAccess: 'STAIRS' },
    request: { primaryService: { canonicalService: 'Regular Home Cleaning' }, frequency: 'ONE_TIME', homeCondition: 'STANDARD', addOns: [], ecoFriendlyProducts: true, laundry: { facilities: 'WASHER_DRYER', laundryLoads: 3, ironingLoads: 4 } },
    visit: { preferredDate: '2026-08-20', alternativeDate: '2026-08-22', preferredTime: 'MORNING', flexibility: 'Two days', urgency: 'Normal', recurringNotes: 'Use the same products each visit' },
    access: { complexAccess: 'VISITOR_SIGN_IN', securityInstructions: 'Check in', parking: 'Visitor bay', keyHandover: 'SOMEONE_WILL_OPEN', someonePresent: true },
    household: { hasPets: false }, safety: { existingDamage: 'Customer reports scratched floor' }, notes: {},
  };
  function harness(quoteOverrides: any = {}) {
    const quote = { ...baseQuote, photos: [{ id: 'photo-1', quoteRevisionId: 'revision-1', status: 'STORED' }], customerResolution: QuoteEntityResolution.USE_EXISTING, propertyResolution: QuoteEntityResolution.USE_EXISTING, resolutionRevisionNumber: 2, customerId: 'customer-1', propertyId: 'property-1', ...quoteOverrides };
    const tx: any = {
      quote: { findUnique: jest.fn(async () => quote), updateMany: jest.fn(async () => ({ count: 1 })), findUniqueOrThrow: jest.fn(async () => ({ ...quote, status: QuoteStatus.ACCEPTED, workOrderId: 'work-order-1' })) },
      quoteRevision: { findUnique: jest.fn(async () => ({ ...revision, structuredData: acceptedSubmission })) },
      user: { findUnique: jest.fn(async () => ({ id: 'admin-1' })) }, customer: { findUnique: jest.fn(async () => ({ id: 'customer-1' })), create: jest.fn() },
      property: { findUnique: jest.fn(async () => ({ id: 'property-1', customerId: 'customer-1' })), create: jest.fn() },
      businessListOption: { findFirst: jest.fn() },
      service: { findMany: jest.fn(async () => [
        { id: 'primary-1', name: 'Regular Home Cleaning', normalizedName: 'regular home cleaning', status: 'ACTIVE', type: 'PRIMARY' },
        { id: 'laundry-1', name: 'Laundry', normalizedName: 'laundry', status: 'ACTIVE', type: 'ADD_ON' },
        { id: 'ironing-1', name: 'Ironing', normalizedName: 'ironing', status: 'ACTIVE', type: 'ADD_ON' },
      ]) },
      workOrderDailyCounter: { upsert: jest.fn(async () => ({ sequence: 1 })) },
      recurringServiceAgreement: { create: jest.fn(async ({ data }: any) => ({ id: 'agreement-1', ...data })) },
      workOrder: { findUnique: jest.fn(async () => ({ recurringAgreementId: quote.recurringAgreementId })), create: jest.fn(async ({ data }: any) => ({ id: 'work-order-1', ...data })) },
      workOrderActivity: { create: jest.fn(async () => ({})) }, quoteActivity: { create: jest.fn(async () => ({})) },
    };
    const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaService;
    return { service: new QuoteReviewService(prisma), tx };
  }

  it('creates and links one WorkOrder with exact accepted revision and load quantities', async () => {
    const { service, tx } = harness();
    await service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-1');
    expect(tx.workOrder.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      customerId: 'customer-1', propertyId: 'property-1', frequency: 'ONE_TIME', preferredTimeWindow: 'MORNING', alternativeDate: new Date('2026-08-22T00:00:00.000Z'),
      dateFlexibility: 'Two days', urgency: 'Normal', exactFloor: 4, buildingAccess: 'STAIRS', complexAccess: 'VISITOR_SIGN_IN', accessInstructions: 'Check in',
      parkingInstructions: 'Visitor bay', keyHandover: 'SOMEONE_WILL_OPEN', someonePresent: true, ecoFriendlyProducts: true,
      customerDeclaredExistingDamage: 'Customer reports scratched floor', quoteEvidence: { create: [{ quotePhotoId: 'photo-1' }] },
      addOns: { create: [{ serviceId: 'laundry-1', quantity: 3 }, { serviceId: 'ironing-1', quantity: 4 }] },
    }) });
    expect(tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: QuoteStatus.ACCEPTED, acceptedRevisionId: 'revision-1', workOrderId: 'work-order-1' }) }));
    expect(tx.quoteActivity.create).toHaveBeenCalledWith({ data: expect.objectContaining({ previousStatus: QuoteStatus.SUBMITTED, newStatus: QuoteStatus.ACCEPTED, actorUserId: 'admin-1' }) });
  });

  it('returns an already complete accepted result without creating a duplicate WorkOrder', async () => {
    const { service, tx } = harness({ status: QuoteStatus.ACCEPTED, acceptedRevisionId: 'revision-1', workOrderId: 'work-order-1' });
    await service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-2');
    expect(tx.workOrder.create).not.toHaveBeenCalled();
    expect(tx.quoteActivity.create).not.toHaveBeenCalled();
  });

  it('materializes CREATE_NEW Customer and Property inside the acceptance transaction', async () => {
    const { service, tx } = harness({ customerResolution: QuoteEntityResolution.CREATE_NEW, propertyResolution: QuoteEntityResolution.CREATE_NEW, customerId: null, propertyId: null });
    tx.customer.create.mockResolvedValue({ id: 'new-customer' });
    tx.businessListOption.findFirst.mockResolvedValue({ id: 'house-option' });
    tx.property.create.mockResolvedValue({ id: 'new-property' });
    await service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-1');
    expect(tx.customer.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ownerId: 'admin-1', contactName: 'Alex', email: 'alex@example.com' }) });
    expect(tx.property.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: 'new-customer', addressLine1: '1 Main Road', propertyTypeOptionId: 'house-option' }) });
    expect(tx.workOrder.create).toHaveBeenCalledWith({ data: expect.objectContaining({ customerId: 'new-customer', propertyId: 'new-property' }) });
  });

  it('fails before operational writes for stale, terminal, and cross-Customer inputs', async () => {
    const stale = harness();
    await expect(stale.service.accept('quote-1', { expectedRevisionNumber: 1 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    expect(stale.tx.workOrder.create).not.toHaveBeenCalled();
    for (const status of [QuoteStatus.NEEDS_ATTENTION, QuoteStatus.DECLINED, QuoteStatus.EXPIRED]) {
      await expect(harness({ status }).service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    }
    const crossCustomer = harness();
    crossCustomer.tx.property.findUnique.mockResolvedValue({ id: 'property-1', customerId: 'other-customer' });
    await expect(crossCustomer.service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['WEEKLY', 'EVERY_TWO_WEEKS', 'MONTHLY', 'CUSTOM'])('atomically creates a %s agreement and its initial visit', async (frequency) => {
    const recurring = harness();
    recurring.tx.quoteRevision.findUnique.mockResolvedValue({ ...revision, structuredData: {
      ...acceptedSubmission,
      request: { ...acceptedSubmission.request, frequency, customFrequencyNote: frequency === 'CUSTOM' ? 'Every six weeks' : undefined },
    } });
    await recurring.service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-1');
    expect(recurring.tx.recurringServiceAgreement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      propertyId: 'property-1', serviceId: 'primary-1', frequency, effectiveDate: new Date('2026-08-20T00:00:00.000Z'),
      preferredTimeWindow: 'MORNING', recurringInstructions: 'Use the same products each visit', ecoFriendlyProducts: true,
      addOns: { create: [{ serviceId: 'laundry-1', quantity: 3 }, { serviceId: 'ironing-1', quantity: 4 }] },
    }) });
    expect(recurring.tx.workOrder.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      customerId: 'customer-1', propertyId: 'property-1', recurringAgreementId: 'agreement-1', frequency,
      recurrenceDate: new Date('2026-08-20T00:00:00.000Z'),
      addOns: { create: [{ serviceId: 'laundry-1', quantity: 3 }, { serviceId: 'ironing-1', quantity: 4 }] },
    }) });
    expect(recurring.tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      recurringAgreementId: 'agreement-1', workOrderId: 'work-order-1', acceptedRevisionId: 'revision-1',
    }) }));
  });

  it('recovers an identical recurring retry and rejects incompatible linkage', async () => {
    const identical = harness({ status: QuoteStatus.ACCEPTED, acceptedRevisionId: 'revision-1', recurringAgreementId: 'agreement-1', workOrderId: 'work-order-1' });
    await identical.service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-2');
    expect(identical.tx.recurringServiceAgreement.create).not.toHaveBeenCalled();
    expect(identical.tx.quoteActivity.create).not.toHaveBeenCalled();
    const incompatible = harness({ status: QuoteStatus.ACCEPTED, acceptedRevisionId: 'revision-1', recurringAgreementId: 'agreement-1', workOrderId: 'work-order-1' });
    incompatible.tx.workOrder.findUnique.mockResolvedValue({ recurringAgreementId: 'other-agreement' });
    await expect(incompatible.service.accept('quote-1', { expectedRevisionNumber: 2 }, 'admin-2')).rejects.toBeInstanceOf(ConflictException);
  });
});
