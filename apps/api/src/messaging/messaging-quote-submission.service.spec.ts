import { describe, expect, it, jest } from '@jest/globals';
import { MessagingChannel, QuoteStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import type { QuoteSubmissionService } from '../quotes/quote-submission.service';
import type { MessagingQuoteStateService } from './messaging-quote-state.service';
import { MessagingQuoteSubmissionService } from './messaging-quote-submission.service';

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

function readyState(overrides: Record<string, unknown> = {}) {
  return {
    version: 3,
    draft: completeDraft,
    humanReviewRequired: false,
    reviewSummaryMessageId: 'message-review',
    confirmationMessageId: 'message-confirm',
    confirmedAt: '2026-08-21T17:00:00.000Z',
    submissionKey: null,
    submittedQuoteId: null,
    ...overrides,
  };
}

function harness(state = readyState()) {
  const conversation = {
    id: '11111111-1111-4111-8111-111111111111',
    channel: MessagingChannel.WHATSAPP,
    provider: 'meta',
    quoteState: state,
    quoteStateVersion: state.version as number,
  };
  const prisma = {
    messagingConversation: { findUnique: jest.fn(async () => conversation) },
    quote: { findUnique: jest.fn(async () => null) },
  } as unknown as PrismaService;

  const beginSubmission = jest.fn(async (_conversationId: string, expectedVersion: number, submissionKey: string) => ({
    ...state, version: expectedVersion + 1, submissionKey, phase: 'SUBMITTING',
  }));
  const recordSubmittedQuote = jest.fn(async (_conversationId: string, expectedVersion: number, quoteId: string) => ({
    ...state, version: expectedVersion + 1, submissionKey: 'reserved', submittedQuoteId: quoteId, phase: 'SUBMITTED',
  }));
  const quoteState = { beginSubmission, recordSubmittedQuote } as unknown as MessagingQuoteStateService;

  const submit = jest.fn(async (_input: unknown, _resolveReplay: unknown) => ({
    quoteId: '22222222-2222-4222-8222-222222222222',
    quoteReference: 'Q-20260823-0001',
    quoteStatus: QuoteStatus.SUBMITTED,
    created: true,
    replay: false,
    pricing: { currency: 'ZAR', subtotalMinor: 125000, adjustmentsMinor: 0, totalMinor: 125000, lines: [] },
    attentionReasons: [],
  }));
  const quoteSubmissions = { submit } as unknown as QuoteSubmissionService;

  return { service: new MessagingQuoteSubmissionService(prisma, quoteState, quoteSubmissions), prisma, beginSubmission, recordSubmittedQuote, submit, conversation };
}

describe('MessagingQuoteSubmissionService', () => {
  it('reserves READY_TO_SUBMIT state before authoritative Quote creation and canonical linkage', async () => {
    const h = harness();
    const result = await h.service.submitReadyQuote(h.conversation.id, 3, 0);

    expect(h.beginSubmission).toHaveBeenCalledTimes(1);
    const stableKey = h.beginSubmission.mock.calls[0]?.[2];
    expect(stableKey).toMatch(/^messaging:[0-9a-f]{64}$/);
    expect(h.beginSubmission).toHaveBeenCalledWith(h.conversation.id, 3, stableKey, 0);

    expect(h.submit).toHaveBeenCalledTimes(1);
    const input = h.submit.mock.calls[0]?.[0] as any;
    expect(input.submissionKey).toBe(stableKey);
    expect(input.submittedAt).toBe('2026-08-21T17:00:00.000Z');
    expect(input.pricingSubmission).toEqual(completeDraft);
    expect(input.structuredData).toEqual(expect.objectContaining({
      schemaVersion: 'MESSAGING_QUOTE_V1', source: 'HOMENT_MESSAGING', submittedAt: '2026-08-21T17:00:00.000Z', customer: completeDraft.customer,
      messagingProvenance: expect.objectContaining({ channel: 'WHATSAPP', provider: 'meta', conversationId: h.conversation.id, confirmationMessageId: 'message-confirm' }),
    }));
    expect(input.submittedActivityMetadata).toEqual(expect.objectContaining({
      source: 'HOMENT_MESSAGING', channel: 'WHATSAPP', provider: 'meta', conversationId: h.conversation.id, confirmationMessageId: 'message-confirm',
    }));
    expect(h.recordSubmittedQuote).toHaveBeenCalledWith(h.conversation.id, 4, '22222222-2222-4222-8222-222222222222', 0);
    expect(result.messagingQuoteState.phase).toBe('SUBMITTED');
  });

  it('resumes an existing SUBMITTING reservation without reserving again', async () => {
    const initial = readyState();
    const first = harness(initial);
    await first.service.submitReadyQuote(first.conversation.id, 3, 0);
    const stableKey = first.beginSubmission.mock.calls[0]?.[2] as string;

    const submitting = readyState({ version: 4, submissionKey: stableKey });
    const retry = harness(submitting);
    retry.conversation.quoteStateVersion = 4;
    await retry.service.submitReadyQuote(retry.conversation.id, 4, 0);

    expect(retry.beginSubmission).not.toHaveBeenCalled();
    expect(retry.submit).toHaveBeenCalledTimes(1);
    expect((retry.submit.mock.calls[0]?.[0] as any).submissionKey).toBe(stableKey);
    expect(retry.recordSubmittedQuote).toHaveBeenCalledWith(retry.conversation.id, 4, '22222222-2222-4222-8222-222222222222', 0);
  });

  it('fails closed when a stored reservation does not match confirmed provenance', async () => {
    const h = harness(readyState({ version: 4, submissionKey: 'messaging:wrong' }));
    h.conversation.quoteStateVersion = 4;
    await expect(h.service.submitReadyQuote(h.conversation.id, 4, 0)).rejects.toThrow('Messaging Quote submission reservation does not match confirmed provenance.');
    expect(h.submit).not.toHaveBeenCalled();
  });

  it('returns an already-linked canonical Quote without creating another one', async () => {
    const submitted = readyState({ version: 5, submissionKey: 'messaging:reserved', submittedQuoteId: '22222222-2222-4222-8222-222222222222' });
    const h = harness(submitted);
    h.conversation.quoteStateVersion = 5;
    (h.prisma.quote.findUnique as jest.Mock).mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222', reference: 'Q-20260823-0001', status: QuoteStatus.SUBMITTED } as never);

    const result = await h.service.submitReadyQuote(h.conversation.id, 5, 0);
    expect(result).toEqual(expect.objectContaining({ quoteId: '22222222-2222-4222-8222-222222222222', quoteReference: 'Q-20260823-0001', created: false, replay: true }));
    expect(h.beginSubmission).not.toHaveBeenCalled();
    expect(h.submit).not.toHaveBeenCalled();
    expect(h.recordSubmittedQuote).not.toHaveBeenCalled();
  });

  it('refuses to create a Quote before explicit confirmation', async () => {
    const h = harness(readyState({ version: 1, reviewSummaryMessageId: null, confirmationMessageId: null, confirmedAt: null }));
    h.conversation.quoteStateVersion = 1;
    await expect(h.service.submitReadyQuote(h.conversation.id, 1, 0)).rejects.toThrow('Messaging Quote is not ready for submission. Current phase is REVIEW.');
    expect(h.submit).not.toHaveBeenCalled();
  });
});
