import { describe, expect, it, jest } from '@jest/globals';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import { resolveWebsiteQuoteReplay } from './website-quote-replay-resolution';

type QuoteLookup = {
  id: string;
  reference: string;
  currentRevisionNumber: number;
  revisions: Array<{ revisionNumber: number; structuredData: unknown }>;
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
      floorSize: 'UNDER_80',
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
  return {
    quote: {
      findUnique: jest.fn(async () => result),
    },
  } as never;
}

describe('website Quote replay resolution', () => {
  it('classifies an unseen submission identity as NEW', async () => {
    await expect(resolveWebsiteQuoteReplay(prismaWith(null), payload())).resolves.toEqual({ kind: 'NEW' });
  });

  it('classifies the same submission identity and material as REPLAY', async () => {
    const submitted = payload();
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      currentRevisionNumber: 1,
      revisions: [{ revisionNumber: 1, structuredData: JSON.parse(JSON.stringify(submitted)) }],
    };

    await expect(resolveWebsiteQuoteReplay(prismaWith(existing), submitted)).resolves.toEqual({
      kind: 'REPLAY',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('classifies reuse of the same identity with changed material as CONFLICT', async () => {
    const submitted = payload();
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      currentRevisionNumber: 1,
      revisions: [{ revisionNumber: 1, structuredData: { ...submitted, notes: { additionalNotes: 'original' } } }],
    };

    await expect(resolveWebsiteQuoteReplay(prismaWith(existing), submitted)).resolves.toEqual({
      kind: 'CONFLICT',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });

  it('fails closed when the current revision pointer has no matching revision', async () => {
    const existing: QuoteLookup = {
      id: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      reference: 'Q-20260811-0001',
      currentRevisionNumber: 2,
      revisions: [{ revisionNumber: 1, structuredData: payload() }],
    };

    await expect(resolveWebsiteQuoteReplay(prismaWith(existing), payload())).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    });
  });
});
