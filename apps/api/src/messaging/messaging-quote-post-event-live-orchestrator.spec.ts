import { describe, expect, it, jest } from '@jest/globals';
import { MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import { MessagingQuoteLiveOrchestratorService } from './messaging-quote-live-orchestrator.service';

const automationControl = { automationEnabled: jest.fn(async () => true) } as any;

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

function postEventCollectingState(overrides: Record<string, unknown> = {}) {
  return {
    version: 4,
    phase: 'COLLECTING',
    draft: {
      property: {
        propertyType: 'HOUSE',
        addressLine1: '1 Test Street',
        suburb: 'Johannesburg',
        country: 'South Africa',
        floorSize: 'FROM_100_TO_129',
        bedrooms: 'THREE',
        bathrooms: 'TWO',
        livingAreas: 'ONE',
        outdoorArea: 'PATIO',
        estateClassification: 'NONE',
      },
      request: {
        primaryService: { websiteValue: 'Post-Event Cleaning', canonicalService: 'Post-Event Cleaning' },
        frequency: 'ONE_TIME',
        homeCondition: 'STANDARD',
      },
    },
    humanReviewRequired: false,
    reviewSummaryMessageId: null,
    confirmationMessageId: null,
    confirmedAt: null,
    submissionKey: null,
    submittedQuoteId: null,
    ...overrides,
  } as any;
}

describe('live Post-Event Messaging quote collection', () => {
  it('presents the first Post-Event question after base cleaning requirements are complete', async () => {
    let createdText = '';
    const prisma = {
      messagingMessage: {
        findUnique: jest.fn(async (args: any) => args.where.id ? inbound('hello') : null),
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
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.postevent', acceptedAt: '2026-08-23T12:40:00.000Z' })) } as any;
    const quoteState = {
      get: jest.fn(async () => postEventCollectingState()),
      updateDraft: jest.fn(),
    } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    await service.handleInbound('message-inbound');

    expect(createdText).toContain('What type of event was it?');
    expect(quoteState.updateDraft).not.toHaveBeenCalled();
  });

  it('accepts a Post-Event answer only after the matching durable prompt was accepted', async () => {
    const acceptedPrompt = {
      id: 'prompt-1',
      conversationId: 'conversation-1',
      direction: MessagingDirection.OUTBOUND,
      kind: MessagingMessageKind.TEXT,
      contentText: 'What type of event was it?',
      statusEvents: [{ status: MessagingDeliveryStatus.ACCEPTED }],
    };
    let lookupCount = 0;
    let createdText = '';
    const prisma = {
      messagingMessage: {
        findUnique: jest.fn(async (args: any) => {
          if (args.where.id) return inbound('1');
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
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.next', acceptedAt: '2026-08-23T12:41:00.000Z' })) } as any;
    const updated = postEventCollectingState({
      version: 5,
      draft: {
        ...postEventCollectingState().draft,
        request: {
          ...postEventCollectingState().draft.request,
          postEvent: { eventType: 'PARTY_BIRTHDAY' },
        },
      },
    });
    const quoteState = {
      get: jest.fn(async () => postEventCollectingState()),
      updateDraft: jest.fn(async () => updated),
    } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    await service.handleInbound('message-inbound');

    expect(quoteState.updateDraft).toHaveBeenCalledWith('conversation-1', 4, {
      request: { postEvent: { eventType: 'PARTY_BIRTHDAY' } },
    });
    expect(createdText).toContain('Where did the event take place?');
  });
});
