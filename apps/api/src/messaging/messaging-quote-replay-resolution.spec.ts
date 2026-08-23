import { describe, expect, it, jest } from '@jest/globals';
import type { PrismaService } from '../prisma.service';
import { resolveMessagingQuoteReplay } from './messaging-quote-replay-resolution';

const structuredData = {
  schemaVersion: 'MESSAGING_QUOTE_V1',
  source: 'HOMENT_MESSAGING',
  submittedAt: '2026-08-21T17:00:00.000Z',
  customer: { fullName: 'Test Customer' },
};

function prismaReturning(value: unknown) {
  return {
    quote: {
      findUnique: jest.fn(async () => value),
    },
  } as unknown as PrismaService;
}

describe('resolveMessagingQuoteReplay', () => {
  it('returns NEW when the stable submission key has not been used', async () => {
    await expect(resolveMessagingQuoteReplay(
      prismaReturning(null),
      'messaging:key',
      structuredData,
    )).resolves.toEqual({ kind: 'NEW' });
  });

  it('returns REPLAY when immutable structured data is the same regardless of key order', async () => {
    const prisma = prismaReturning({
      id: 'quote-1',
      reference: 'Q-20260823-0001',
      revisions: [{
        structuredData: {
          customer: { fullName: 'Test Customer' },
          submittedAt: '2026-08-21T17:00:00.000Z',
          source: 'HOMENT_MESSAGING',
          schemaVersion: 'MESSAGING_QUOTE_V1',
        },
      }],
    });

    await expect(resolveMessagingQuoteReplay(prisma, 'messaging:key', structuredData)).resolves.toEqual({
      kind: 'REPLAY',
      quoteId: 'quote-1',
      quoteReference: 'Q-20260823-0001',
    });
  });

  it('returns CONFLICT when the same submission key points to different immutable data', async () => {
    const prisma = prismaReturning({
      id: 'quote-1',
      reference: 'Q-20260823-0001',
      revisions: [{ structuredData: { ...structuredData, submittedAt: '2026-08-21T18:00:00.000Z' } }],
    });

    await expect(resolveMessagingQuoteReplay(prisma, 'messaging:key', structuredData)).resolves.toEqual({
      kind: 'CONFLICT',
      quoteId: 'quote-1',
      quoteReference: 'Q-20260823-0001',
    });
  });

  it('fails closed as CORRUPT_EXISTING when the original customer submission revision is not unique', async () => {
    const prisma = prismaReturning({
      id: 'quote-1',
      reference: 'Q-20260823-0001',
      revisions: [],
    });

    await expect(resolveMessagingQuoteReplay(prisma, 'messaging:key', structuredData)).resolves.toEqual({
      kind: 'CORRUPT_EXISTING',
      quoteId: 'quote-1',
      quoteReference: 'Q-20260823-0001',
    });
  });
});
