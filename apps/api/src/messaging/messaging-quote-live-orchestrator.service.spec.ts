import { describe, expect, it, jest } from '@jest/globals';
import { MessagingDeliveryStatus, MessagingDirection, MessagingMessageKind } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import { MessagingQuoteLiveOrchestratorService } from './messaging-quote-live-orchestrator.service';
import { MessagingAutomationAuthorityChangedError } from './messaging-quote-state.service';

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
      controlVersion: 0,
    },
  };
}

function inboundMedia(channel: 'WHATSAPP' | 'MESSENGER' = 'WHATSAPP') {
  return {
    ...inbound(''),
    kind: MessagingMessageKind.MEDIA,
    contentText: null,
    conversation: { ...inbound('').conversation, channel },
  };
}

function authority() {
  return { controlState: 'AUTOMATION', controlVersion: 0 };
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

function photoReadyDraft() {
  return {
    property: {
      propertyType: 'HOUSE',
      addressLine1: '1 Test Street',
      suburb: 'Johannesburg',
      country: 'South Africa',
      floorSize: 'FROM_80_TO_99',
      bedrooms: 'THREE',
      bathrooms: 'TWO',
      livingAreas: 'ONE',
      storeys: 'ONE',
      outdoorArea: 'NONE',
      estateClassification: 'NONE',
    },
    request: {
      primaryService: { websiteValue: 'Deep Cleaning', canonicalService: 'Deep Cleaning' },
      frequency: 'ONE_TIME',
      homeCondition: 'STANDARD',
      addOns: [],
      ecoFriendlyProducts: false,
    },
    visit: {
      preferredDate: '2026-08-25',
      alternativeDate: '',
      preferredTime: 'MORNING',
      flexibility: 'Flexible',
      urgency: 'Standard',
      recurringNotes: '',
    },
    access: {
      complexAccess: 'NOT_APPLICABLE',
      securityInstructions: '',
      parking: '',
      keyHandover: 'SOMEONE_WILL_OPEN',
      someonePresent: true,
    },
    household: { hasPets: false },
    safety: {
      offLimitsAreas: '',
      fragileItems: '',
      productRestrictions: '',
      allergiesOrSensitivities: '',
      existingDamage: '',
    },
    notes: {
      attentionAreas: '',
      renovationDust: '',
      applianceNotes: '',
      additionalNotes: '',
    },
  };
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
  it('does not read or advance Quote state or send when human takeover is active', async () => {
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => inbound('answer while handled')) } } as unknown as PrismaService;
    const messaging = { send: jest.fn() } as any;
    const quoteState = { get: jest.fn(), updateDraft: jest.fn() } as any;
    const control = { automationEnabled: jest.fn(async () => false) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, control);

    await expect(service.handleInbound('message-inbound')).resolves.toBeNull();
    expect(quoteState.get).not.toHaveBeenCalled();
    expect(quoteState.updateDraft).not.toHaveBeenCalled();
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('does not interpret a menu-like inbound value before the matching question was accepted', async () => {
    let createdText = '';
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async (args: any) => args.where.id ? inbound('3') : null) },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: { create: async (args: any) => { createdText = args.data.contentText; return { id: 'prompt-1', ...args.data }; } },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.prompt', acceptedAt: '2026-08-23T12:00:00.000Z' })) } as any;
    const quoteState = { get: jest.fn(async () => collectingState()), updateDraft: jest.fn() } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    const result = await service.handleInbound('message-inbound');
    expect(createdText).toContain('What type of property is it?');
    expect(quoteState.updateDraft).not.toHaveBeenCalled();
    expect(messaging.send).toHaveBeenCalledTimes(1);
    expect(result?.phase).toBe('COLLECTING');
  });

  it('accepts a bounded answer only after the exact current prompt was accepted', async () => {
    const acceptedPrompt = { id: 'prompt-1', conversationId: 'conversation-1', direction: MessagingDirection.OUTBOUND, kind: MessagingMessageKind.TEXT, contentText: 'What type of property is it?', statusEvents: [{ status: MessagingDeliveryStatus.ACCEPTED }] };
    let lookupCount = 0;
    let createdText = '';
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async (args: any) => { if (args.where.id) return inbound('3'); lookupCount += 1; return lookupCount === 1 ? acceptedPrompt : null; }) },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: { create: async (args: any) => { createdText = args.data.contentText; return { id: 'prompt-2', ...args.data }; } },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.prompt2', acceptedAt: '2026-08-23T12:01:00.000Z' })) } as any;
    const updated = collectingState({ version: 1, draft: { property: { propertyType: 'HOUSE' } } });
    const quoteState = { get: jest.fn(async () => collectingState()), updateDraft: jest.fn(async () => updated) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    const result = await service.handleInbound('message-inbound');
    expect(quoteState.updateDraft).toHaveBeenCalledWith('conversation-1', 0, { property: { propertyType: 'HOUSE' } }, 0);
    expect(createdText).toContain('What is the street address?');
    expect(result).toBe(updated);
  });

  it('records secured WhatsApp images with the observed automation control version', async () => {
    const assetId = '11111111-1111-4111-8111-111111111111';
    const acceptedPrompt = { id: 'prompt-photo', statusEvents: [{ status: MessagingDeliveryStatus.ACCEPTED }] };
    let lookupCount = 0;
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async (args: any) => { if (args.where.id) return inboundMedia(); lookupCount += 1; return lookupCount === 1 ? acceptedPrompt : null; }) },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $queryRaw: jest.fn(async () => [{
        id: assetId,
        message_id: 'message-inbound',
        conversation_id: 'conversation-1',
        provider: 'meta',
        provider_media_id: 'media-1',
        mime_type: 'image/jpeg',
        file_name: 'kitchen.jpg',
        provider_file_size: BigInt(1234),
        storage_path: 'whatsapp/message-inbound/media-1',
        status: 'STORED',
      }]),
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: { create: async (args: any) => ({ id: 'prompt-next-photo', ...args.data }) },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const state = collectingState({ version: 7, draft: photoReadyDraft() });
    const updated = collectingState({ version: 8, draft: { ...photoReadyDraft(), messagingMediaAssetIds: [assetId] } });
    const quoteState = { get: jest.fn(async () => state), updateDraft: jest.fn(async () => updated) } as any;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.photo-next', acceptedAt: '2026-08-23T12:02:00.000Z' })) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    const result = await service.handleInbound('message-inbound');
    expect(quoteState.updateDraft).toHaveBeenCalledWith('conversation-1', 7, { messagingMediaAssetIds: [assetId] }, 0);
    expect(result).toBe(updated);
    expect(messaging.send).toHaveBeenCalledTimes(1);
  });

  it('fails closed if takeover changes automation authority before a secured photo mutation commits', async () => {
    const assetId = '11111111-1111-4111-8111-111111111111';
    const acceptedPrompt = { id: 'prompt-photo', statusEvents: [{ status: MessagingDeliveryStatus.ACCEPTED }] };
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async (args: any) => args.where.id ? inboundMedia() : acceptedPrompt) },
      $queryRaw: jest.fn(async () => [{
        id: assetId,
        message_id: 'message-inbound',
        conversation_id: 'conversation-1',
        provider: 'meta',
        provider_media_id: 'media-1',
        mime_type: 'image/jpeg',
        file_name: 'kitchen.jpg',
        provider_file_size: BigInt(1234),
        storage_path: 'whatsapp/message-inbound/media-1',
        status: 'STORED',
      }]),
    } as unknown as PrismaService;
    const state = collectingState({ version: 7, draft: photoReadyDraft() });
    const quoteState = {
      get: jest.fn(async () => state),
      updateDraft: jest.fn(async () => { throw new MessagingAutomationAuthorityChangedError(); }),
    } as any;
    const messaging = { send: jest.fn() } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    await expect(service.handleInbound('message-inbound')).resolves.toBeNull();
    expect(quoteState.updateDraft).toHaveBeenCalledWith('conversation-1', 7, { messagingMediaAssetIds: [assetId] }, 0);
    expect(messaging.send).not.toHaveBeenCalled();
  });

  it('keeps Messenger media disabled during guided Quote photo collection', async () => {
    const acceptedPrompt = { id: 'prompt-photo', statusEvents: [{ status: MessagingDeliveryStatus.ACCEPTED }] };
    let lookupCount = 0;
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async (args: any) => { if (args.where.id) return inboundMedia('MESSENGER'); lookupCount += 1; return lookupCount === 1 ? acceptedPrompt : null; }) },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: { create: async (args: any) => ({ id: 'retry-photo', ...args.data }) },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const quoteState = { get: jest.fn(async () => collectingState({ version: 7, draft: photoReadyDraft() })), updateDraft: jest.fn() } as any;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'mid.retry', acceptedAt: '2026-08-23T12:03:00.000Z' })) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, { submitReadyQuote: jest.fn() } as any, automationControl);

    await service.handleInbound('message-inbound');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(quoteState.updateDraft).not.toHaveBeenCalled();
    expect(messaging.send).toHaveBeenCalledTimes(1);
  });

  it('sends and records one durable review summary when REVIEW has not been presented yet', async () => {
    const state = reviewState({ reviewSummaryMessageId: null });
    let createdText = '';
    const prisma = {
      messagingMessage: { findUnique: jest.fn(async (args: any) => args.where.id ? inbound('hello') : null) },
      messagingConversation: { findUnique: jest.fn(async () => authority()) },
      $transaction: jest.fn(async (callback: any) => callback({
        messagingMessage: { create: async (args: any) => { createdText = args.data.contentText; return { id: 'message-review', conversationId: 'conversation-1', direction: MessagingDirection.OUTBOUND, kind: MessagingMessageKind.TEXT, ...args.data }; } },
        messagingMessageStatusEvent: { create: async () => ({}) },
      })),
    } as unknown as PrismaService;
    const messaging = { send: jest.fn(async () => ({ providerMessageId: 'wamid.review', acceptedAt: '2026-08-23T11:00:00.000Z' })) } as any;
    const quoteState = { get: jest.fn(async () => state), recordReviewPresented: jest.fn(async () => reviewState()) } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn() } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, messaging, quoteState, quoteSubmission, automationControl);

    await service.handleInbound('message-inbound');
    expect(createdText).toContain('Please review your quote request:');
    expect(createdText).toContain('Reply CONFIRM exactly');
    expect(messaging.send).toHaveBeenCalledTimes(1);
    expect(quoteState.recordReviewPresented).toHaveBeenCalledWith('conversation-1', 3, 'message-review', 0);
    expect(quoteSubmission.submitReadyQuote).not.toHaveBeenCalled();
  });

  it('accepts only exact uppercase CONFIRM as customer authorization', async () => {
    const ready = reviewState({ version: 4, phase: 'READY_TO_SUBMIT', confirmationMessageId: 'message-inbound', confirmedAt: '2026-08-23T11:00:00.000Z' });
    const submitted = { ...ready, version: 6, phase: 'SUBMITTED', submittedQuoteId: 'quote-1' };
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => inbound('CONFIRM')) } } as unknown as PrismaService;
    let getCount = 0;
    const quoteState = { get: jest.fn(async () => (++getCount === 1 ? reviewState() : submitted)), confirmFromInboundMessage: jest.fn(async () => ready) } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn(async () => ({ quoteId: 'quote-1' })) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, { send: jest.fn() } as any, quoteState, quoteSubmission, automationControl);

    const result = await service.handleInbound('message-inbound');
    expect(quoteState.confirmFromInboundMessage).toHaveBeenCalledWith('conversation-1', 3, 'message-inbound', 0);
    expect(quoteSubmission.submitReadyQuote).toHaveBeenCalledWith('conversation-1', 4, 0);
    expect(result).toEqual(submitted);
  });

  it('does not treat conversational variants as confirmation', async () => {
    const prisma = { messagingMessage: { findUnique: jest.fn(async (args: any) => args.where.id ? inbound('confirm') : null) } } as unknown as PrismaService;
    const quoteState = { get: jest.fn(async () => reviewState()), confirmFromInboundMessage: jest.fn() } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn() } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, { send: jest.fn() } as any, quoteState, quoteSubmission, automationControl);
    await service.handleInbound('message-inbound');
    expect(quoteState.confirmFromInboundMessage).not.toHaveBeenCalled();
    expect(quoteSubmission.submitReadyQuote).not.toHaveBeenCalled();
  });

  it('resumes a safely confirmed READY_TO_SUBMIT state after an interrupted prior attempt', async () => {
    const ready = reviewState({ version: 4, phase: 'READY_TO_SUBMIT' });
    const submitted = { ...ready, phase: 'SUBMITTED', submittedQuoteId: 'quote-1' };
    const prisma = { messagingMessage: { findUnique: jest.fn(async () => inbound('anything')) } } as unknown as PrismaService;
    let getCount = 0;
    const quoteState = { get: jest.fn(async () => (++getCount === 1 ? ready : submitted)) } as any;
    const quoteSubmission = { submitReadyQuote: jest.fn(async () => ({ quoteId: 'quote-1' })) } as any;
    const service = new MessagingQuoteLiveOrchestratorService(prisma, { send: jest.fn() } as any, quoteState, quoteSubmission, automationControl);
    await service.handleInbound('message-inbound');
    expect(quoteSubmission.submitReadyQuote).toHaveBeenCalledWith('conversation-1', 4, 0);
  });
});