import { describe, expect, it } from '@jest/globals';
import { MessagingConversationControlState, MessagingDirection } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import {
  MessagingAutomationAuthorityChangedError,
  MessagingQuoteStateService,
} from './messaging-quote-state.service';

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

type ConversationRow = {
  quoteState: unknown;
  quoteStateVersion: number;
  controlState?: MessagingConversationControlState;
  controlVersion?: number;
};

function prismaFor(
  row: ConversationRow,
  options?: {
    updateCount?: number;
    messageDirection?: MessagingDirection;
    authorityAfterLock?: { state: MessagingConversationControlState; version: number };
  },
) {
  let persisted = {
    ...row,
    controlState: row.controlState ?? MessagingConversationControlState.AUTOMATION,
    controlVersion: row.controlVersion ?? 0,
  };
  const tx = {
    async $queryRaw() {
      if (options?.authorityAfterLock) {
        persisted = {
          ...persisted,
          controlState: options.authorityAfterLock.state,
          controlVersion: options.authorityAfterLock.version,
        };
      }
      return [{ id: 'conversation-1' }];
    },
    messagingConversation: {
      async findUnique() { return persisted; },
      async updateMany(args: { data: { quoteState: unknown; quoteStateVersion: number } }) {
        if (options?.updateCount === 0) return { count: 0 };
        persisted = { ...persisted, quoteState: args.data.quoteState, quoteStateVersion: args.data.quoteStateVersion };
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

  it('persists inbound draft progress when automation authority still matches', async () => {
    const holder = prismaFor({ quoteState: null, quoteStateVersion: 0, controlVersion: 0 });
    const service = new MessagingQuoteStateService(holder.prisma);
    const result = await service.updateDraft('conversation-1', 0, completeDraft, 0);
    expect(result.version).toBe(1);
    expect(result.phase).toBe('REVIEW');
    expect(holder.read().quoteStateVersion).toBe(1);
  });

  it('rejects an inbound Quote mutation when takeover wins before the locked commit boundary', async () => {
    const holder = prismaFor(
      { quoteState: null, quoteStateVersion: 0, controlVersion: 0 },
      { authorityAfterLock: { state: MessagingConversationControlState.HUMAN_TAKEOVER, version: 1 } },
    );
    const service = new MessagingQuoteStateService(holder.prisma);
    await expect(service.updateDraft('conversation-1', 0, completeDraft, 0)).rejects.toBeInstanceOf(
      MessagingAutomationAuthorityChangedError,
    );
    expect(holder.read().quoteStateVersion).toBe(0);
  });

  it('rejects stale takeover-period inbound after explicit handback to automation', async () => {
    const holder = prismaFor({
      quoteState: null,
      quoteStateVersion: 0,
      controlState: MessagingConversationControlState.AUTOMATION,
      controlVersion: 2,
    });
    const service = new MessagingQuoteStateService(holder.prisma);
    await expect(service.updateDraft('conversation-1', 0, completeDraft, 0)).rejects.toBeInstanceOf(
      MessagingAutomationAuthorityChangedError,
    );
    expect(holder.read().quoteStateVersion).toBe(0);
  });

  it('rejects stale Quote-state callers before mutation', async () => {
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
      submissionKey: null,
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

  it('persists a submission reservation with optimistic version advancement', async () => {
    const initial = {
      version: 3,
      draft: completeDraft,
      humanReviewRequired: false,
      reviewSummaryMessageId: 'message-review',
      confirmationMessageId: 'message-confirm',
      confirmedAt: '2026-08-21T17:00:00.000Z',
      submissionKey: null,
      submittedQuoteId: null,
    };
    const holder = prismaFor({ quoteState: initial, quoteStateVersion: 3 });
    const service = new MessagingQuoteStateService(holder.prisma);
    const result = await service.beginSubmission('conversation-1', 3, 'messaging:abc');
    expect(result).toEqual(expect.objectContaining({
      version: 4,
      submissionKey: 'messaging:abc',
      phase: 'SUBMITTING',
    }));
    expect(holder.read().quoteStateVersion).toBe(4);
  });
});
