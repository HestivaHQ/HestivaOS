import { describe, expect, it, jest } from '@jest/globals';
import { MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import { MessagingQuoteLiveOrchestratorService } from './messaging-quote-live-orchestrator.service';

const automationControl = { automationEnabled: jest.fn(async () => true) } as any;

function inbound(contentText: string) {
  return {
    id: `inbound-${contentText}`,
    conversationId: 'conversation-1',
    direction: MessagingDirection.INBOUND,
    kind: MessagingMessageKind.TEXT,
    contentText,
    conversation: { channel: 'WHATSAPP', provider: 'meta', providerIdentityId: '27821234567', controlVersion: 0 },
  };
}

function reviewState() {
  return {
    version: 8,
    phase: 'REVIEW',
    draft: {
      property: { propertyType: 'HOUSE', addressLine1: '1 Test Street', suburb: 'Johannesburg' },
      request: {
        primaryService: { websiteValue: 'Deep Cleaning', canonicalService: 'Deep Cleaning' },
        frequency: 'ONE_TIME',
        homeCondition: 'STANDARD',
      },
      visit: { preferredDate: '2026-08-25', preferredTime: 'MORNING' },
      access: { complexAccess: 'NOT_APPLICABLE', someonePresent: true },
      household: { hasPets: false },
      safety: {},
      notes: {},
      photos: [],
      customer: { fullName: 'Test Customer', email: 'test@example.com', mobile: '+27821234567', preferredContact: 'WHATSAPP' },
    },
    humanReviewRequired: false,
    reviewSummaryMessageId: 'review-message',
    confirmationMessageId: null,
    confirmedAt: null,
    submissionKey: null,
    submittedQuoteId: null,
  } as any;
}

function transaction(prismaMessages: any[]) {
  return async (callback: any) => callback({
    messagingMessage: {
      create: async (args: any) => {
        const created = { id: `outbound-${prismaMessages.length + 1}`, ...args.data };
        prismaMessages.push(created);
        return created;
      },
    },
    messagingMessageStatusEvent: { create: async () => ({}) },
  });
}

function authority() {
  return { controlState: 'AUTOMATION', controlVersion: 0 };
}

describe('Messaging Quote review correction', () => {
  it('offers a deterministic correction menu only after exact CHANGE', async () => {
    const created: any[] = [];
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async (args: any) => args.where.id ? inbound('CHANGE') : null) },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $transaction: jest.fn(transaction(created)),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.change' })) } as any;
    const quoteState = { get: jest.fn(async () => reviewState()) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    await service.handleInbound('inbound-CHANGE');

    expect(created).toHaveLength(1);
    expect(created[0].contentText).toContain('Which section would you like to change?');
    expect(created[0].contentText).toContain('6. Your customer details');
  });

  it('does not interpret a correction selection until the correction menu has accepted-delivery evidence', async () => {
    const created: any[] = [];
    const prisma = {
      messagingMessage: {
        findUnique: jest.fn(async (args: any) => {
          if (args.where.id) return inbound('2');
          if (String(args.where.idempotencyKey).startsWith('messaging-quote-correction:')) return { statusEvents: [] };
          return null;
        }),
      },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $transaction: jest.fn(transaction(created)),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn() } as any;
    const quoteState = { get: jest.fn(async () => reviewState()), updateDraft: jest.fn() } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    await service.handleInbound('inbound-2');

    expect(quoteState.updateDraft).not.toHaveBeenCalled();
  });

  it('clears the selected section and immediately resumes deterministic collection', async () => {
    const created: any[] = [];
    let lookup = 0;
    const prisma = {
      messagingMessage: {
        findUnique: jest.fn(async (args: any) => {
          if (args.where.id) return inbound('2');
          const key = String(args.where.idempotencyKey);
          if (key.startsWith('messaging-quote-correction:')) {
            return { statusEvents: [{ status: MessagingDeliveryStatus.ACCEPTED }] };
          }
          lookup += 1;
          return null;
        }),
      },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $transaction: jest.fn(transaction(created)),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: `wamid.${lookup}` })) } as any;
    const updated = { ...reviewState(), version: 9, phase: 'COLLECTING', draft: { ...reviewState().draft, request: null }, reviewSummaryMessageId: null } as any;
    const quoteState = {
      get: jest.fn(async () => reviewState()),
      updateDraft: jest.fn(async () => updated),
    } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    const result = await service.handleInbound('inbound-2');

    expect(quoteState.updateDraft).toHaveBeenCalledWith('conversation-1', 8, { request: null }, 0);
    expect(created).toHaveLength(1);
    expect(String(created[0].contentText).length).toBeGreaterThan(0);
    expect(result?.phase).toBe('COLLECTING');
  });

  it('keeps exact CONFIRM authoritative even when correction is available', async () => {
    const ready = { ...reviewState(), version: 9, phase: 'READY_TO_SUBMIT', confirmationMessageId: 'inbound-CONFIRM', confirmedAt: '2026-08-23T14:00:00.000Z' } as any;
    const submitted = { ...ready, version: 11, phase: 'SUBMITTED', submittedQuoteId: 'quote-1' } as any;
    let getCount = 0;
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => inbound('CONFIRM')) } } as unknown as PrismaService;
    const quoteState = {
      get: jest.fn(async () => (++getCount === 1 ? reviewState() : submitted)),
      confirmFromInboundMessage: jest.fn(async () => ready),
    } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn(async () => ({ quoteId: 'quote-1' })) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, { send: jest.fn() } as any, quoteState, quoteSubmission, automationControl);

    await service.handleInbound('inbound-CONFIRM');

    expect(quoteState.confirmFromInboundMessage).toHaveBeenCalledWith('conversation-1', 8, 'inbound-CONFIRM', 0);
    expect(quoteSubmission.submitReadyQuote).toHaveBeenCalledWith('conversation-1', 9, 0);
  });
});
