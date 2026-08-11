import { describe, expect, it, jest } from '@jest/globals';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import { resolveWebsiteQuoteReplay } from './website-quote-replay-resolution';

type QuoteLookup = {
  id: string;
  reference: string;
  revisions: Array<{ structuredData: unknown }>;
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

function prismaWith(result: QuoteLookup) {
  const findUnique = jest.fn(async () => result);
  return { prisma: { quote: { findUnique } } as never, findUnique };
}

describe('website Quote replay resolution', () => {
  it('classifies an unseen submission identity as NEW', async () => {
    const { prisma } = prismaWith(null);
    await expect(resolveWebsiteQuoteReplay(prisma, payload())).resolves.toEqual({ kind: 'NEW' });
  });

  it('classifies the same submission identity and original material as REPLAY', async () => {
    const submitted = payload();
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      revisions: [{ structuredData: JSON.parse(JSON.stringify(submitted)) }],
    };
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'REPLAY',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('queries only CUSTOMER_SUBMISSION revisions and reads enough rows to detect corruption', async () => {
    const submitted = payload();
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      revisions: [{ structuredData: submitted }],
    };
    const { prisma, findUnique } = prismaWith(existing);

    await resolveWebsiteQuoteReplay(prisma, submitted);

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { submissionKey: submitted.submissionId },
      select: expect.objectContaining({
        revisions: {
          where: { origin: 'CUSTOMER_SUBMISSION' },
          orderBy: { revisionNumber: 'asc' },
          take: 2,
          select: { structuredData: true },
        },
      }),
    }));
  });

  it('classifies reuse of the same identity with changed original material as CONFLICT', async () => {
    const submitted = payload();
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      revisions: [{ structuredData: { ...submitted, notes: { additionalNotes: 'original' } } }],
    };
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'CONFLICT',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('fails closed when the Quote has no original customer-submission revision', async () => {
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      revisions: [],
    };
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, payload())).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('fails closed when the Quote has duplicate original customer-submission revisions', async () => {
    const submitted = payload();
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      revisions: [
        { structuredData: submitted },
        { structuredData: JSON.parse(JSON.stringify(submitted)) },
      ],
    };
    const { prisma } = prismaWith(existing);

    await expect(resolveWebsiteQuoteReplay(prisma, submitted)).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });
});
