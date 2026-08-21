import { MessagingProvider } from '@prisma/client';
import { messagingQuoteSubmissionKey, prepareMessagingQuoteCreation } from './messaging-quote-creation-input';

const completeDraft = {
  customer: { fullName: 'Test Customer', email: 'test@example.com', mobile: '+27821234567', preferredContact: 'WHATSAPP' as const },
  property: {
    propertyType: 'HOUSE' as const,
    addressLine1: '1 Test Street',
    suburb: 'Johannesburg',
    country: 'South Africa' as const,
    floorSize: 'FROM_80_TO_99' as const,
    bedrooms: 'THREE' as const,
    bathrooms: 'TWO' as const,
    livingAreas: 'ONE' as const,
    storeys: 'ONE' as const,
    outdoorArea: 'NONE' as const,
    estateClassification: 'NONE' as const,
  },
  request: {
    primaryService: { websiteValue: 'Deep Cleaning', canonicalService: 'Deep Cleaning' },
    frequency: 'ONE_TIME' as const,
    homeCondition: 'STANDARD' as const,
    addOns: [],
  },
  visit: { preferredDate: '2026-08-25', preferredTime: 'MORNING' as const, flexibility: 'Flexible', urgency: 'Standard' },
  access: { complexAccess: 'NOT_APPLICABLE' as const, keyHandover: 'SOMEONE_WILL_OPEN' as const, someonePresent: true },
  household: { hasPets: false },
  safety: {},
  notes: {},
  photos: [],
};

describe('Messaging Quote creation identity', () => {
  it('uses a stable retry-safe key for the same confirmed message', () => {
    const input = {
      provider: MessagingProvider.WHATSAPP,
      conversationId: 'conversation-123',
      confirmationMessageId: 'wamid.confirm-456',
    };

    expect(messagingQuoteSubmissionKey(input)).toBe(messagingQuoteSubmissionKey(input));
    expect(messagingQuoteSubmissionKey(input)).toMatch(/^messaging:[0-9a-f]{64}$/);
  });

  it('changes identity when the confirmation message changes', () => {
    const base = { provider: MessagingProvider.WHATSAPP, conversationId: 'conversation-123' };
    expect(messagingQuoteSubmissionKey({ ...base, confirmationMessageId: 'one' }))
      .not.toBe(messagingQuoteSubmissionKey({ ...base, confirmationMessageId: 'two' }));
  });

  it('prepares only a confirmed valid draft and keeps messaging provenance', () => {
    const result = prepareMessagingQuoteCreation({
      provider: MessagingProvider.WHATSAPP,
      conversationId: 'conversation-123',
      confirmationMessageId: 'wamid.confirm-456',
      confirmedAt: new Date('2026-08-21T16:00:00.000Z'),
      draft: completeDraft,
      customerConfirmed: true,
    });

    expect(result.kind).toBe('READY');
    if (result.kind !== 'READY') return;
    expect(result.value.provenance).toEqual({
      channel: 'MESSAGING',
      provider: MessagingProvider.WHATSAPP,
      conversationId: 'conversation-123',
      confirmationMessageId: 'wamid.confirm-456',
    });
    expect(result.value.submissionKey).toMatch(/^messaging:[0-9a-f]{64}$/);
  });

  it('does not prepare an unconfirmed draft', () => {
    const result = prepareMessagingQuoteCreation({
      provider: MessagingProvider.MESSENGER,
      conversationId: 'conversation-123',
      confirmationMessageId: 'mid.confirm-456',
      confirmedAt: new Date('2026-08-21T16:00:00.000Z'),
      draft: completeDraft,
      customerConfirmed: false,
    });

    expect(result.kind).toBe('NOT_READY');
  });
});
