import { describe, expect, it } from '@jest/globals';
import {
  applyMessagingGuidedPostEventAnswer,
  nextMessagingGuidedPostEventQuestion,
} from './messaging-quote-guided-post-event';
import { initialMessagingQuoteState, updateMessagingQuoteDraft } from './messaging-quote-state';

function postEventState() {
  return updateMessagingQuoteDraft(initialMessagingQuoteState(), {
    request: {
      primaryService: {
        websiteValue: 'Post-Event Cleaning',
        canonicalService: 'Post-Event Cleaning',
      },
    },
  });
}

function accept(state: ReturnType<typeof postEventState>, text: string) {
  const answer = applyMessagingGuidedPostEventAnswer(state.draft, text);
  expect(answer.kind).toBe('ACCEPTED');
  if (answer.kind !== 'ACCEPTED') return state;
  return updateMessagingQuoteDraft(state, answer.patch);
}

describe('guided Post-Event Messaging Quote collection', () => {
  it('does not activate for another primary service', () => {
    const state = updateMessagingQuoteDraft(initialMessagingQuoteState(), {
      request: {
        primaryService: {
          websiteValue: 'Regular Home Cleaning',
          canonicalService: 'Regular Home Cleaning',
        },
      },
    });
    expect(nextMessagingGuidedPostEventQuestion(state.draft)).toBeNull();
    expect(applyMessagingGuidedPostEventAnswer(state.draft, '1')).toEqual({ kind: 'NOT_APPLICABLE' });
  });

  it('starts with bounded event context and refuses arbitrary prose', () => {
    const state = postEventState();
    expect(nextMessagingGuidedPostEventQuestion(state.draft)?.id).toBe('EVENT_TYPE');
    expect(applyMessagingGuidedPostEventAnswer(state.draft, 'big birthday at home').kind).toBe('INVALID');
  });

  it('collects every approved Post-Event workload fact without erasing primary service', () => {
    let state = postEventState();
    for (const answer of [
      '1',
      '1',
      '3',
      '2',
      'YES',
      '2',
      '1,3',
      '2',
      'YES',
      'NO',
      'NO',
      'NO',
      'NO',
      'NO',
    ]) {
      state = accept(state, answer);
    }

    expect(nextMessagingGuidedPostEventQuestion(state.draft)).toBeNull();
    expect(state.draft.request).toEqual(expect.objectContaining({
      primaryService: expect.objectContaining({ canonicalService: 'Post-Event Cleaning' }),
      postEvent: {
        eventType: 'PARTY_BIRTHDAY',
        venueType: 'HOME',
        guestBand: 'FROM_51_TO_100',
        bathrooms: 2,
        kitchenSubstantiallyUsed: true,
        dishwashing: 'MODERATE',
        outdoorAreas: ['PATIO', 'BRAAI_AREA'],
        wasteLevel: 'MODERATE',
        significantOrdinarySoiling: true,
        lateNightOrOvernight: false,
        bulkWasteRemovalRequested: false,
        specialistContamination: false,
        specialistCarpetOrUpholstery: false,
        complexVenue: false,
      },
    }));
  });

  it('requires an exact positive bathroom count and bounded outdoor selections', () => {
    let state = postEventState();
    state = accept(state, '1');
    state = accept(state, '1');
    state = accept(state, '1');

    expect(nextMessagingGuidedPostEventQuestion(state.draft)?.id).toBe('EXACT_BATHROOMS');
    expect(applyMessagingGuidedPostEventAnswer(state.draft, '0').kind).toBe('INVALID');
    expect(applyMessagingGuidedPostEventAnswer(state.draft, '21').kind).toBe('INVALID');
    state = accept(state, '1');
    state = accept(state, 'NO');
    state = accept(state, '1');

    expect(nextMessagingGuidedPostEventQuestion(state.draft)?.id).toBe('OUTDOOR_AREAS');
    expect(applyMessagingGuidedPostEventAnswer(state.draft, '1,1').kind).toBe('INVALID');
    expect(applyMessagingGuidedPostEventAnswer(state.draft, '1,5').kind).toBe('INVALID');
    expect(applyMessagingGuidedPostEventAnswer(state.draft, '0')).toEqual({
      kind: 'ACCEPTED',
      patch: { request: { postEvent: { outdoorAreas: [] } } },
    });
  });

  it('keeps review-triggering answers as explicit facts instead of guessing them away', () => {
    let state = postEventState();
    for (const answer of [
      '4',
      '4',
      '5',
      '6',
      'YES',
      '3',
      '4',
      '3',
      'YES',
      'YES',
      'YES',
      'YES',
      'YES',
      'YES',
    ]) state = accept(state, answer);

    expect(state.draft.request?.postEvent).toEqual(expect.objectContaining({
      guestBand: 'FROM_150_UP',
      lateNightOrOvernight: true,
      bulkWasteRemovalRequested: true,
      specialistContamination: true,
      specialistCarpetOrUpholstery: true,
      complexVenue: true,
    }));
  });
});
