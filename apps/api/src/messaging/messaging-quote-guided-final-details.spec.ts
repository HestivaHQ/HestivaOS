import { describe, expect, it } from '@jest/globals';
import {
  applyMessagingGuidedFinalDetailsAnswer,
  nextMessagingGuidedFinalDetailsQuestion,
} from './messaging-quote-guided-final-details';
import type { MessagingQuoteDraftProgress } from './messaging-quote-draft';

function safetyComplete() {
  return {
    offLimitsAreas: '',
    fragileItems: '',
    productRestrictions: '',
    allergiesOrSensitivities: '',
    existingDamage: '',
  };
}

function notesComplete() {
  return {
    attentionAreas: '',
    renovationDust: '',
    applianceNotes: '',
    additionalNotes: '',
  };
}

function finalDraft(overrides: MessagingQuoteDraftProgress = {}): MessagingQuoteDraftProgress {
  return {
    safety: safetyComplete(),
    notes: notesComplete(),
    photos: [],
    customer: {
      fullName: 'Test Customer',
      email: 'test@example.com',
      mobile: '+27821234567',
      preferredContact: 'WHATSAPP',
    },
    ...overrides,
  };
}

describe('guided Messaging final details', () => {
  it('collects optional safety and note fields explicitly instead of guessing absence', () => {
    expect(nextMessagingGuidedFinalDetailsQuestion({})?.id).toBe('OFF_LIMITS_AREAS');
    expect(applyMessagingGuidedFinalDetailsAnswer({}, '0')).toEqual({
      kind: 'ACCEPTED',
      patch: { safety: { offLimitsAreas: '' } },
    });

    const noteDraft = { safety: safetyComplete(), notes: {} } as MessagingQuoteDraftProgress;
    expect(nextMessagingGuidedFinalDetailsQuestion(noteDraft)?.id).toBe('ATTENTION_AREAS');
    expect(applyMessagingGuidedFinalDetailsAnswer(noteDraft, '  kitchen grout  ')).toEqual({
      kind: 'ACCEPTED',
      patch: { notes: { attentionAreas: 'kitchen grout' } },
    });
  });

  it('requires an explicit no-photo choice and does not invent Quote photo metadata', () => {
    const draft = { safety: safetyComplete(), notes: notesComplete() } as MessagingQuoteDraftProgress;
    expect(nextMessagingGuidedFinalDetailsQuestion(draft)?.id).toBe('PHOTOS');
    expect(applyMessagingGuidedFinalDetailsAnswer(draft, '1').kind).toBe('INVALID');
    expect(applyMessagingGuidedFinalDetailsAnswer(draft, '0')).toEqual({
      kind: 'ACCEPTED',
      patch: { photos: [] },
    });
  });

  it('collects customer identity fields without inferring the WhatsApp sender as the Quote customer', () => {
    const draft = finalDraft({ customer: {} });
    expect(nextMessagingGuidedFinalDetailsQuestion(draft)?.id).toBe('FULL_NAME');
    expect(applyMessagingGuidedFinalDetailsAnswer(draft, '  Jane Doe  ')).toEqual({
      kind: 'ACCEPTED',
      patch: { customer: { fullName: 'Jane Doe' } },
    });
  });

  it('fails closed on invalid email and non-E164 mobile values', () => {
    const emailDraft = finalDraft({ customer: { fullName: 'Jane Doe' } });
    expect(nextMessagingGuidedFinalDetailsQuestion(emailDraft)?.id).toBe('EMAIL');
    expect(applyMessagingGuidedFinalDetailsAnswer(emailDraft, 'not-an-email').kind).toBe('INVALID');

    const mobileDraft = finalDraft({ customer: { fullName: 'Jane Doe', email: 'jane@example.com' } });
    expect(nextMessagingGuidedFinalDetailsQuestion(mobileDraft)?.id).toBe('MOBILE');
    expect(applyMessagingGuidedFinalDetailsAnswer(mobileDraft, '0821234567').kind).toBe('INVALID');
    expect(applyMessagingGuidedFinalDetailsAnswer(mobileDraft, '+27821234567')).toEqual({
      kind: 'ACCEPTED',
      patch: { customer: { mobile: '+27821234567' } },
    });
  });

  it('uses the bounded canonical preferred-contact values and then completes', () => {
    const draft = finalDraft({ customer: { fullName: 'Jane Doe', email: 'jane@example.com', mobile: '+27821234567' } });
    expect(nextMessagingGuidedFinalDetailsQuestion(draft)?.id).toBe('PREFERRED_CONTACT');
    expect(applyMessagingGuidedFinalDetailsAnswer(draft, 'whatsapp').kind).toBe('INVALID');
    expect(applyMessagingGuidedFinalDetailsAnswer(draft, '3')).toEqual({
      kind: 'ACCEPTED',
      patch: { customer: { preferredContact: 'WHATSAPP' } },
    });
    expect(nextMessagingGuidedFinalDetailsQuestion(finalDraft())).toBeNull();
    expect(applyMessagingGuidedFinalDetailsAnswer(finalDraft(), 'anything')).toEqual({ kind: 'COMPLETE' });
  });
});
