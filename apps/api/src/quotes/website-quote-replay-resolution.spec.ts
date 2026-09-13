import { describe, expect, it, jest } from '@jest/globals';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import { resolveWebsiteQuoteReplay } from './website-quote-replay-resolution';

type StoredRevision = {
  structuredData: unknown;
  currency: string;
  subtotalMinor: number;
  totalMinor: number;
  lineItems: Array<{
    type: 'PRIMARY_SERVICE' | 'ADD_ON' | 'ADJUSTMENT';
    code: string;
    label: string;
    quantity: number;
    unitAmountMinor: number;
    lineTotalMinor: number;
  }>;
};

type QuoteLookup = {
  id: string;
  reference: string;
  activities: Array<{ newStatus: 'SUBMITTED' | 'NEEDS_ATTENTION' | 'ACCEPTED' | null }>;
  revisions: StoredRevision[];
} | null;

function payload(overrides: Record<string, unknown> = {}): WebsiteQuoteSubmissionV1 {
  return {
    schemaVersion: '1.0',
    submissionId: '123e4567-e89b-42d3-a456-426614174000',
    source: 'HESTIVA_WEBSITE',
    submittedAt: '2026-08-11T13:00:00.000Z',
    customer: { fullName: 'Test Customer', email: 'test@example.com', mobile: '+27821234567', preferredContact: 'EMAIL' },
    property: {
      propertyType: 'HOUSE',
      addressLine1: '1 Test Street',
      suburb: 'Johannesburg',
      country: 'South Africa',
      floorSize: 'FROM_60_TO_79',
      bedrooms: 'TWO',
      bathrooms: 'ONE',
      livingAreas: 'ONE',
      outdoorArea: 'NONE',
      estateClassification: 'NONE',
    },
    request: {
      primaryService: { websiteValue: 'Regular Home Cleaning', canonicalService: 'Regular Home Cleaning' },
      frequency: 'ONE_TIME',
      homeCondition: 'STANDARD',
      addOns: [],
    },
    visit: { preferredDate: '2026-08-15', preferredTime: 'MORNING', flexibility: 'Flexible', urgency: 'Normal' },
    access: { complexAccess: 'NOT_APPLICABLE', keyHandover: 'SOMEONE_WILL_OPEN', someonePresent: true },
    household: { hasPets: false },
    safety: {},
    notes: {},
    photos: [],
    ...overrides,
  } as WebsiteQuoteSubmissionV1;
}

function storedRevision(submitted: WebsiteQuoteSubmissionV1): StoredRevision {
  return {
    structuredData: JSON.parse(JSON.stringify(submitted)),
    currency: 'ZAR',
    subtotalMinor: 80000,
    totalMinor: 82500,
    lineItems: [
      {
        type: 'PRIMARY_SERVICE',
        code: 'PRIMARY_REGULAR_HOME_CLEANING',
        label: 'Regular Home Cleaning',
        quantity: 1,
        unitAmountMinor: 80000,
        lineTotalMinor: 80000,
      },
      {
        type: 'ADJUSTMENT',
        code: 'PROFITABILITY_FLOOR_ADJUSTMENT',
        label: 'Profitability safeguard adjustment',
        quantity: 1,
        unitAmountMinor: 2500,
        lineTotalMinor: 2500,
      },
    ],
  };
}

function existingQuote(submitted: WebsiteQuoteSubmissionV1): NonNullable<QuoteLookup> {
  return {
    id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
    reference: 'Q-20260811-0001',
    activities: [{ newStatus: 'SUBMITTED' }],
    revisions: [storedRevision(submitted)],
  };
}

function prismaWith(result: QuoteLookup) {
  const findUnique = jest.fn(async () => result);
  return { prisma: { quote: { findUnique } } as never, findUnique };
}

describe('website Quote replay resolution', () => {
  it('classifies an unseen submission identity as NEW', async () => {
    const { prisma } = prismaWith(null);
    await expect(resolveWebsiteQuoteReplay(prisma, payload())).resolves.toEqual({ kind: 'NEW' });
  });

  it('returns the persisted original status and pricing snapshot for an identical replay', async () => {
    const submitted = payload();
    const existing = existingQuote(submitted);
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'REPLAY',
      quoteId: existing.id,
      quoteReference: existing.reference,
      response: {
        quoteStatus: 'SUBMITTED',
        pricing: {
          currency: 'ZAR',
          subtotalMinor: 80000,
          adjustmentsMinor: 2500,
          totalMinor: 82500,
          lines: [{
            code: 'PRIMARY_REGULAR_HOME_CLEANING',
            label: 'Regular Home Cleaning',
            quantity: 1,
            unitAmountMinor: 80000,
            lineAmountMinor: 80000,
          }],
        },
      },
    });
  });

  it('queries the immutable submission revision and original submitted status needed for replay', async () => {
    const submitted = payload();
    const existing = existingQuote(submitted);
    const { prisma, findUnique } = prismaWith(existing);

    await resolveWebsiteQuoteReplay(prisma, submitted);

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { submissionKey: submitted.submissionId },
      select: expect.objectContaining({
        activities: {
          where: { type: 'QUOTE_SUBMITTED' },
          orderBy: { createdAt: 'asc' },
          take: 2,
          select: { newStatus: true },
        },
        revisions: expect.objectContaining({
          where: { origin: 'CUSTOMER_SUBMISSION' },
          orderBy: { revisionNumber: 'asc' },
          take: 2,
          select: expect.objectContaining({
            structuredData: true,
            currency: true,
            subtotalMinor: true,
            totalMinor: true,
          }),
        }),
      }),
    }));
  });

  it('classifies reuse of the same identity with changed original material as CONFLICT', async () => {
    const submitted = payload();
    const existing = existingQuote(submitted);
    existing.revisions[0].structuredData = { ...submitted, notes: { additionalNotes: 'original' } };
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'CONFLICT',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('fails closed when the Quote has no original customer-submission revision', async () => {
    const submitted = payload();
    const existing = existingQuote(submitted);
    existing.revisions = [];
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('fails closed when the Quote has duplicate original customer-submission revisions', async () => {
    const submitted = payload();
    const existing = existingQuote(submitted);
    existing.revisions.push(storedRevision(submitted));
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('fails closed when the original submitted status or persisted currency is invalid', async () => {
    const submitted = payload();
    const existing = existingQuote(submitted);
    existing.activities[0].newStatus = 'ACCEPTED';
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });

    existing.activities[0].newStatus = 'SUBMITTED';
    existing.revisions[0].currency = 'USD';
    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });
});
