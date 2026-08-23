import { describe, expect, it } from '@jest/globals';
import { evaluateMessagingQuoteFlow } from './messaging-quote-flow';
import {
  applyMessagingGuidedHomeAnswer,
  nextMessagingGuidedHomeQuestion,
} from './messaging-quote-guided-home';
import { updateMessagingQuoteDraft, initialMessagingQuoteState } from './messaging-quote-state';

function accept(state: ReturnType<typeof initialMessagingQuoteState>, text: string) {
  const answer = applyMessagingGuidedHomeAnswer(state.draft, text);
  expect(answer.kind).toBe('ACCEPTED');
  if (answer.kind !== 'ACCEPTED') return state;
  return updateMessagingQuoteDraft(state, answer.patch);
}

describe('guided Messaging Quote home collection', () => {
  it('starts with a bounded property-type question and refuses ambiguous prose', () => {
    const state = initialMessagingQuoteState();
    expect(nextMessagingGuidedHomeQuestion(state.draft)?.id).toBe('PROPERTY_TYPE');
    expect(applyMessagingGuidedHomeAnswer(state.draft, 'three bedroom house')).toEqual(
      expect.objectContaining({ kind: 'INVALID' }),
    );
  });

  it('merges answers without erasing earlier property facts', () => {
    let state = initialMessagingQuoteState();
    state = accept(state, '3');
    state = accept(state, '12 Main Road');
    state = accept(state, 'Orange Farm');

    expect(state.draft.property).toEqual(expect.objectContaining({
      propertyType: 'HOUSE',
      addressLine1: '12 Main Road',
      suburb: 'Orange Farm',
    }));
    expect(state.version).toBe(3);
  });

  it('does not treat a partially collected property object as a complete fact group', () => {
    const state = updateMessagingQuoteDraft(initialMessagingQuoteState(), {
      property: { propertyType: 'HOUSE' },
    });
    const flow = evaluateMessagingQuoteFlow({ draft: state.draft });
    expect(flow.phase).toBe('COLLECTING');
    expect(flow.missingFactGroups).toContain('property');
    expect(flow.nextSection).toBe('YOUR_HOME');
  });

  it('collects a complete supported house without inventing optional facts', () => {
    let state = initialMessagingQuoteState();
    for (const answer of [
      '3',
      '12 Main Road',
      'Orange Farm',
      'YES',
      '4',
      '4',
      '2',
      '1',
      '1',
      '1',
    ]) {
      state = accept(state, answer);
    }

    expect(nextMessagingGuidedHomeQuestion(state.draft)).toBeNull();
    const flow = evaluateMessagingQuoteFlow({ draft: state.draft });
    expect(flow.missingFactGroups).not.toContain('property');
    expect(flow.phase).toBe('COLLECTING');
    expect(flow.nextSection).toBe('CLEANING_REQUIREMENTS');
  });

  it('requires apartment floor and access before the property group is complete', () => {
    let state = initialMessagingQuoteState();
    for (const answer of [
      '1',
      '5 Test Street',
      'Sandton',
      'YES',
      '3',
      '2',
      '1',
      '1',
    ]) {
      state = accept(state, answer);
    }

    expect(nextMessagingGuidedHomeQuestion(state.draft)?.id).toBe('APARTMENT_FLOOR');
    expect(applyMessagingGuidedHomeAnswer(state.draft, '51').kind).toBe('INVALID');
    state = accept(state, '4');
    expect(nextMessagingGuidedHomeQuestion(state.draft)?.id).toBe('APARTMENT_ACCESS');
    state = accept(state, '1');
    state = accept(state, '2');
    state = accept(state, '3');

    expect(evaluateMessagingQuoteFlow({ draft: state.draft }).missingFactGroups).not.toContain('property');
  });

  it('never accepts Studio for a non-apartment property', () => {
    const state = updateMessagingQuoteDraft(initialMessagingQuoteState(), {
      property: { propertyType: 'HOUSE', addressLine1: '1 Road', suburb: 'Soweto', country: 'South Africa', floorSize: 'UNDER_40' },
    });
    expect(nextMessagingGuidedHomeQuestion(state.draft)?.id).toBe('BEDROOMS');
    expect(applyMessagingGuidedHomeAnswer(state.draft, '1').kind).toBe('INVALID');
  });
});
