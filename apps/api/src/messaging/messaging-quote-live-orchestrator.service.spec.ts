import { describe, expect, it, jest } from '@jest/globals';
import { MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import { MessagingQuoteLiveOrchestratorService } from './messaging-quote-live-orchestrator.service';

function inbound(contentText: string) {
  return {
    id: 'message-inbound',
    conversationId: 'conversation-1',
    direction: MessagingDirection.INBOUND,
    kind: MessagingMessageKind.TEXT,
    contentText,
    conversation: {
      channel: 'WHATSAPP',
      provider: 'meta',
      providerIdentityId: '27821234567',
    },
  };
}

function reviewState(overrides: Record<string, unknown> = {}) {
  return {
    version: 3,
    phase: 'REVIEW',
    draft: {
      customer: { fullName: 'Test Customer' },
      property: { addressLine1: '1 Test Street', suburb: 'Johannesburg' },
      request: { primaryService: { canonicalService: 'Deep Cleaning' } },
      visit: { preferredDate: '2026-08-25', preferredTime: 'MORNING' },
    },
    humanReviewRequired: false,
    reviewSummaryMessageId: 'message-review',
    confirmationMessageId: null,
    confirmedAt: null,
    submissionKey: null,
    submittedQuoteId: null,
    ...overrides,
  } as any;
}

function collectingState(overrides: Record<string, unknown> = {}) {
  return {
    version: 0,
    phase: 'COLLECTING',
    draft: {},
    humanReviewRequired: false,
    reviewSummaryMessageId: null,
    confirmationMessageId: null,
    confirmedAt: null,
    submissionKey: null,
    submittedQuoteId: null,
    ...overrides,
  } as any;
}

describe('MessagingQuoteLiveOrchestratorService', () => {
  it('does not interpret a menu-like inbound value before the matching question was accepted', async () => {
    let createdText = '';
    const prisma = {
      messagingMessage: {
        findUnique: jest.fn(async (args: any) => args.where.id ? inbound('3') : null),
      },
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: {
          create: async (args: any) => {
            createdText = args.data.contentText;
            return { id: 'prompt-1', ...args.data };
          },
        },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.prompt', acceptedAt: '2026-08-23T12:00:00.000Z' })) } as any;
    const quoteState = {
      get: jest.fn(async () => collectingState()),
      updateDraft: jest.fn(),
    } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any);

    const result = await service.handleInbound('message-inbound');

    expect(createdText).toContain('What type of property is it?');
    expect(quoteState.updateDraft).not.toHaveBeenCalled();
    expect(messaging.send).toHaveBeenCalledTimes(1);
    expect(result.phase).toBe('COLLECTING');
  });

  it('accepts a bounded answer only after the exact current prompt was accepted', async () => {
    const acceptedPrompt = {
      id: 'prompt-1',
      conversationId: 'conversation-1',
      direction: MessagingDirection.OUTBOUND,
      kind: MessagingMessageKind.TEXT,
      contentText: 'What type of property is it?',
      statusEvents: [{ status: MessagingDeliveryStatus.ACCEPTED }],
    };
    let lookupCount = 0;
    let createdText = '';
    const prisma = {
      messagingMessage: {
        findUnique: jest.fn(async (args: any) => {
          if (args.where.id) return inbound('3');
          lookupCount += 1;
          if (lookupCount === 1) return acceptedPrompt;
          return null;
        }),
      },
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: {
          create: async (args: any) => {
            createdText = args.data.contentText;
            return { id: 'prompt-2', ...args.data };
          },
        },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.prompt2', acceptedAt: '2026-08-23T12:01:00.000Z' })) } as any;
    const updated = collectingState({ version: 1, draft: { property: { propertyType: 'HOUSE' } } });
    const quoteState = {
      get: jest.fn(async () => collectingState()),
      updateDraft: jest.fn(async () => updated),
    } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any);

    const result = await service.handleInbound('message-inbound');

    expect(quoteState.updateDraft).toHaveBeenCalledWith('conversation-1', 0, {
      property: { propertyType: 'HOUSE' },
    });
    expect(createdText).toContain('What is the street address?');
    expect(result).toBe(updated);
  });

  it('sends and records one durable review summary when REVIEW has not been presented yet', async () => {
    const state = reviewState({ reviewSummaryMessageId: null });
    const outbound = {
      id: 'message-review',
      conversationId: 'conversation-1',
      direction: MessagingDirection.OUTBOUND,
      kind: MessagingMessageKind.TEXT,
      contentText: expect.any(String),
    };
    let createdText = '';
    const prisma = {
      messagingMessage: {
        findUnique: jest.fn(async (args: any) => {
          if (args.where.id) return inbound('hello');
          return null;
        }),
      },
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: {
          create: async (args: any) => {
            createdText = args.data.contentText;
            return { ...outbound, contentText: createdText };
          },
        },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.review', acceptedAt: '2026-08-23T11:00:00.000Z' })) } as any;
    const quoteState = {
      get: jest.fn(async () => state),
      recordReviewPresented: jest.fn(async () => reviewState()),
    } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn() } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, quoteSubmission);

    await service.handleInbound('message-inbound');

    expect(createdText).toContain('Please review your quote request:');
    expect(createdText).toContain('Reply CONFIRM exactly');
    expect(messaging.send).toHaveBeenCalledTimes(1);
    expect(quoteState.recordReviewPresented).toHaveBeenCalledWith('conversation-1', 3, 'message-review');
    expect(quoteSubmission.submitReadyQuote).not.toHaveBeenCalled();
  });

  it('accepts only exact uppercase CONFIRM as customer authorization', async () => {
    const ready = reviewState({
      version: 4,
      phase: 'READY_TO_SUBMIT',
      confirmationMessageId: 'message-inbound',
      confirmedAt: '2026-08-23T11:00:00.000Z',
    });
    const submitted = { ...ready, version: 6, phase: 'SUBMITTED', submittedQuoteId: 'quote-1' };
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async () => inbound('CONFIRM')) },
    } as unknown as PrismaService;
    const messaging = { send: jest.fn() } as any;
    let getCount = 0;
    const quoteState = {
      get: jest.fn(async () => {
        getCount += 1;
        return getCount === 1 ? reviewState() : submitted;
      }),
      confirmFromInboundMessage: jest.fn(async () => ready),
    } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn(async () => ({ quoteId: 'quote-1' })) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, quoteSubmission);

    const result = await service.handleInbound('message-inbound');

    expect(quoteState.confirmFromInboundMessage).toHaveBeenCalledWith('conversation-1', 3, 'message-inbound');
    expect(quoteSubmission.submitReadyQuote).toHaveBeenCalledWith('conversation-1', 4);
    expect(result).toEqual(submitted);
  });

  it('does not treat conversational variants as confirmation', async () => {
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async () => inbound('confirm')) },
    } as unknown as PrismaService;
    const messaging = { send: jest.fn() } as any;
    const quoteState = {
      get: jest.fn(async () => reviewState()),
      confirmFromInboundMessage: jest.fn(),
    } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn() } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, quoteSubmission);

    await service.handleInbound('message-inbound');

    expect(quoteState.confirmFromInboundMessage).not.toHaveBeenCalled();
    expect(quoteSubmission.submitReadyQuote).not.toHaveBeenCalled();
  });

  it('resumes a safely confirmed READY_TO_SUBMIT state after an interrupted prior attempt', async () => {
    const ready = reviewState({ version: 4, phase: 'READY_TO_SUBMIT' });
    const submitted = { ...ready, phase: 'SUBMITTED', submittedQuoteId: 'quote-1' };
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async () => inbound('anything')) },
    } as unknown as PrismaService;
    const messaging = { send: jest.fn() } as any;
    let getCount = 0;
    const quoteState = {
      get: jest.fn(async () => {
        getCount += 1;
        return getCount === 1 ? ready : submitted;
      }),
    } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn(async () => ({ quoteId: 'quote-1' })) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, quoteSubmission);

    await service.handleInbound('message-inbound');

    expect(quoteSubmission.submitReadyQuote).toHaveBeenCalledWith('conversation-1', 4);
  });
});
