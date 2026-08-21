import { describe, expect, it } from '@jest/globals';
import { MessagingDirection } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import { MessagingQuoteStateService } from './messaging-quote-state.service';

const completeDraft = {
  customer: { fullName: 'Test Customer', email: 'test@example.com', mobile: '+27821234567', preferredContact: 'WHATSAPP' as const },
  property: {
    propertyType: 'HOUSE' as const,
    addressLine1: '1 Test Street', suburb: 'Johannesburg', country: 'South Africa' as const,
    floorSize: 'FROM_80_TO_99' as const, bedrooms: 'THREE' as const, bathrooms: 'TWO' as const,
    livingAreas: 'ONE' as const, storeys: 'ONE' as const, outdoorArea: 'NONE' as const,
    estateClassification: 'NONE' as const,
  },
  request: {
    primaryService: { websiteValue: 'Deep Cleaning', canonicalService: 'Deep Cleaning' },
    frequency: 'ONE_TIME' as const, homeCondition: 'STANDARD' as const, addOns: [],
  },
  visit: { preferredDate: '2026-08-25', preferredTime: 'MORNING' as const, flexibility: 'Flexible', urgency: 'Standard' },
  access: { complexAccess: 'NOT_APPLICABLE' as const, keyHandover: 'SOMEONE_WILL_OPEN' as const, someonePresent: true },
  household: { hasPets: false }, safety: {}, notes: {}, photos: [],
};

type ConversationRow = { quoteState: unknown; quoteStateVersion: number };

function prismaFor(row: ConversationRow, options?: { updateCount?: number; messageDirection?: MessagingDirection }) {
  let persisted: ConversationRow = { ...row };
  const tx = {
    messagingConversation: {
      async findUnique() { return persisted; },
      async updateMany(args: { data: { quoteState: unknown; quoteStateVersion: number } }) {
        if (options?.updateCount === 0) return { count: 0 };
        persisted = { quoteState: args.data.quoteState, quoteStateVersion: args.data.quoteStateVersion };
        return { count: 1 };
      },
    },
  };
  const prisma = {
    messagingConversation: {
      async findUnique() { return persisted; },
    },
    messagingMessage: {
      async findUnique(args: { where: { id: string } }) {
        return {
          id: args.where.id,
          conversationId: 'conversation-1',
          direction: options?.messageDirection ?? MessagingDirection.OUTBOUND,
          occurredAt: new Date('2026-08-21T17:00:00.000Z'),
        };
      },
    },
    quote: {
      async findUnique(args: { where: { id: string } }) { return { id: args.where.id }; },
    },
    async $transaction<T>(callback: (client: typeof tx) => Promise<T>) { return callback(tx); },
  } as unknown as PrismaService;
  return { prisma, read: () => persisted };
}

describe('MessagingQuoteStateService', () => {
  it('reads a fresh conversation as version-zero collecting state', async () => {
    const { prisma } = prismaFor({ quoteState: null, quoteStateVersion: 0 });
    const service = new MessagingQuoteStateService(prisma);
    await expect(service.get('conversation-1')).resolves.toEqual(expect.objectContaining({ version: 0, phase: 'COLLECTING' }));
  });

  it('persists draft progress with optimistic version advancement', async () => {
    const holder = prismaFor({ quoteState: null, quoteStateVersion: 0 });
    const service = new MessagingQuoteStateService(holder.prisma);
    const result = await service.updateDraft('conversation-1', 0, completeDraft);
    expect(result.version).toBe(1);
    expect(result.phase).toBe('REVIEW');
    expect(holder.read().quoteStateVersion).toBe(1);
  });

  it('rejects stale callers before mutation', async () => {
    const holder = prismaFor({ quoteState: null, quoteStateVersion: 0 });
    const service = new MessagingQuoteStateService(holder.prisma);
    await expect(service.updateDraft('conversation-1', 1, completeDraft)).rejects.toThrow(
      'Messaging Quote state is stale. Current version is 0.',
    );
  });

  it('rejects a lost optimistic-concurrency race at the database write', async () => {
    const holder = prismaFor({ quoteState: null, quoteStateVersion: 0 }, { updateCount: 0 });
    const service = new MessagingQuoteStateService(holder.prisma);
    await expect(service.updateDraft('conversation-1', 0, completeDraft)).rejects.toThrow(
      'Messaging Quote state changed concurrently. Reload before retrying.',
    );
  });

  it('requires review-summary provenance to be an outbound message in the same conversation', async () => {
    const holder = prismaFor({ quoteState: null, quoteStateVersion: 0 }, { messageDirection: MessagingDirection.INBOUND });
    const service = new MessagingQuoteStateService(holder.prisma);
    await expect(service.recordReviewPresented('conversation-1', 0, 'message-review')).rejects.toThrow(
      'Messaging Quote state message provenance does not match the conversation.',
    );
  });

  it('uses the durable inbound message occurrence time as customer confirmation time', async () => {
    const initial = {
      version: 1,
      draft: completeDraft,
      humanReviewRequired: false,
      reviewSummaryMessageId: 'message-review',
      confirmationMessageId: null,
      confirmedAt: null,
      submittedQuoteId: null,
    };
    const holder = prismaFor(
      { quoteState: initial, quoteStateVersion: 1 },
      { messageDirection: MessagingDirection.INBOUND },
    );
    const service = new MessagingQuoteStateService(holder.prisma);
    const result = await service.confirmFromInboundMessage('conversation-1', 1, 'message-confirm');
    expect(result.confirmationMessageId).toBe('message-confirm');
    expect(result.confirmedAt).toBe('2026-08-21T17:00:00.000Z');
    expect(result.phase).toBe('READY_TO_SUBMIT');
  });
});
