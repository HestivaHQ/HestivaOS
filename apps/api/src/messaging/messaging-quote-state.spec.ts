import { describe, expect, it } from '@jest/globals';
import {
  beginMessagingQuoteSubmission,
  confirmMessagingQuoteReview,
  initialMessagingQuoteState,
  markMessagingQuoteReviewPresented,
  markMessagingQuoteSubmitted,
  parseMessagingQuoteStateSnapshot,
  setMessagingQuoteHumanReview,
  updateMessagingQuoteDraft,
  viewMessagingQuoteState,
} from './messaging-quote-state';

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

function confirmedState() {
  const complete = updateMessagingQuoteDraft(initialMessagingQuoteState(), completeDraft);
  const reviewed = markMessagingQuoteReviewPresented(complete, 'message-review');
  return confirmMessagingQuoteReview(reviewed, 'message-confirm', new Date('2026-08-21T17:00:00.000Z'));
}

describe('Messaging Quote durable-state transitions', () => {
  it('starts at persistence version zero and reaches review only when canonical fact groups exist', () => {
    const initial = initialMessagingQuoteState();
    expect(initial.version).toBe(0);
    expect(viewMessagingQuoteState(initial).phase).toBe('COLLECTING');

    const complete = updateMessagingQuoteDraft(initial, completeDraft);
    expect(complete.version).toBe(1);
    expect(viewMessagingQuoteState(complete).phase).toBe('REVIEW');
  });

  it('treats a null payload plus version zero as a fresh resumable state', () => {
    expect(parseMessagingQuoteStateSnapshot(null, 0)).toEqual(initialMessagingQuoteState());
  });

  it('accepts pre-reservation persisted snapshots without a submissionKey field', () => {
    const legacy = {
      version: 1,
      draft: completeDraft,
      humanReviewRequired: false,
      reviewSummaryMessageId: null,
      confirmationMessageId: null,
      confirmedAt: null,
      submittedQuoteId: null,
    };
    expect(parseMessagingQuoteStateSnapshot(legacy, 1).submissionKey).toBeNull();
  });

  it('fails closed when persisted JSON and the concurrency version disagree', () => {
    const state = updateMessagingQuoteDraft(initialMessagingQuoteState(), completeDraft);
    expect(() => parseMessagingQuoteStateSnapshot(state, 2)).toThrow(
      'Messaging Quote state payload is inconsistent and requires recovery.',
    );
    expect(() => parseMessagingQuoteStateSnapshot(null, 1)).toThrow(
      'Messaging Quote state payload is missing and requires recovery.',
    );
  });

  it('requires a recorded review summary before customer confirmation', () => {
    const complete = updateMessagingQuoteDraft(initialMessagingQuoteState(), completeDraft);
    expect(() => confirmMessagingQuoteReview(complete, 'message-confirm', new Date())).toThrow(
      'Customer confirmation requires a recorded Quote review summary.',
    );

    const reviewed = markMessagingQuoteReviewPresented(complete, 'message-review');
    const confirmed = confirmMessagingQuoteReview(reviewed, 'message-confirm', new Date('2026-08-21T17:00:00.000Z'));
    expect(confirmed.reviewSummaryMessageId).toBe('message-review');
    expect(confirmed.confirmationMessageId).toBe('message-confirm');
    expect(confirmed.confirmedAt).toBe('2026-08-21T17:00:00.000Z');
    expect(viewMessagingQuoteState(confirmed).phase).toBe('READY_TO_SUBMIT');
  });

  it('invalidates stale review and confirmation whenever draft facts change', () => {
    const changed = updateMessagingQuoteDraft(confirmedState(), {
      notes: { additionalNotes: 'Please focus on the kitchen.' },
    });
    expect(changed.reviewSummaryMessageId).toBeNull();
    expect(changed.confirmationMessageId).toBeNull();
    expect(changed.confirmedAt).toBeNull();
    expect(viewMessagingQuoteState(changed).phase).toBe('REVIEW');
  });

  it('human review pauses submission and clears stale confirmation', () => {
    const held = setMessagingQuoteHumanReview(confirmedState(), true);
    expect(viewMessagingQuoteState(held).phase).toBe('HUMAN_REVIEW');
    expect(held.confirmationMessageId).toBeNull();
    expect(held.reviewSummaryMessageId).toBeNull();
  });

  it('reserves a stable submission before canonical Quote linkage', () => {
    const submitting = beginMessagingQuoteSubmission(confirmedState(), 'messaging:abc');
    expect(submitting.submissionKey).toBe('messaging:abc');
    expect(viewMessagingQuoteState(submitting).phase).toBe('SUBMITTING');
    expect(beginMessagingQuoteSubmission(submitting, 'messaging:abc')).toBe(submitting);
    expect(() => beginMessagingQuoteSubmission(submitting, 'messaging:different')).toThrow(
      'Messaging Quote submission is already reserved with a different identity.',
    );
  });

  it('freezes draft and human-review mutation once submission starts', () => {
    const submitting = beginMessagingQuoteSubmission(confirmedState(), 'messaging:abc');
    expect(() => updateMessagingQuoteDraft(submitting, { notes: {} })).toThrow(
      'Messaging Quote submission has started',
    );
    expect(() => setMessagingQuoteHumanReview(submitting, true)).toThrow(
      'Messaging Quote submission has started',
    );
  });

  it('links exactly one canonical Quote only after submission reservation', () => {
    const confirmed = confirmedState();
    expect(() => markMessagingQuoteSubmitted(confirmed, 'quote-a')).toThrow(
      'Messaging Quote can be linked only after a reserved submission starts.',
    );

    const submitting = beginMessagingQuoteSubmission(confirmed, 'messaging:abc');
    const submitted = markMessagingQuoteSubmitted(submitting, 'quote-a');
    expect(viewMessagingQuoteState(submitted).phase).toBe('SUBMITTED');
    expect(markMessagingQuoteSubmitted(submitted, 'quote-a')).toBe(submitted);
    expect(() => markMessagingQuoteSubmitted(submitted, 'quote-b')).toThrow(
      'Messaging Quote state is already linked to a different canonical Quote.',
    );
  });

  it('never mutates submitted draft facts in place', () => {
    const submitting = beginMessagingQuoteSubmission(confirmedState(), 'messaging:abc');
    const submitted = markMessagingQuoteSubmitted(submitting, 'quote-a');

    expect(() => updateMessagingQuoteDraft(submitted, { notes: {} })).toThrow(
      'Submitted Messaging Quote facts must change through Quote revision, not draft mutation.',
    );
  });
});
