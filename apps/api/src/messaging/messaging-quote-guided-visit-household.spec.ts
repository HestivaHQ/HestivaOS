import { describe, expect, it } from '@jest/globals';
import { applyMessagingGuidedVisitHouseholdAnswer, nextMessagingGuidedVisitHouseholdQuestion } from './messaging-quote-guided-visit-household';

function withVisit(visit: Record<string, unknown>) { return { visit } as any; }
function visitComplete() { return { preferredDate:'2026-08-30', alternativeDate:'', preferredTime:'MORNING', flexibility:'Flexible by one hour', urgency:'This week', recurringNotes:'' }; }

describe('guided Messaging visit and household details', () => {
  it('starts with an exact calendar-date question and rejects prose dates', () => {
    expect(nextMessagingGuidedVisitHouseholdQuestion({})?.id).toBe('PREFERRED_DATE');
    expect(applyMessagingGuidedVisitHouseholdAnswer({}, 'next Tuesday').kind).toBe('INVALID');
    expect(applyMessagingGuidedVisitHouseholdAnswer({}, '2026-08-30')).toEqual({ kind:'ACCEPTED', patch:{ visit:{ preferredDate:'2026-08-30' } } });
  });

  it('allows the optional alternative date to be explicitly skipped', () => {
    const draft = withVisit({ preferredDate:'2026-08-30' });
    expect(nextMessagingGuidedVisitHouseholdQuestion(draft)?.id).toBe('ALTERNATIVE_DATE');
    expect(applyMessagingGuidedVisitHouseholdAnswer(draft, '0')).toEqual({ kind:'ACCEPTED', patch:{ visit:{ alternativeDate:'' } } });
  });

  it('uses bounded preferred-time values and stores flexibility and urgency verbatim', () => {
    const timeDraft = withVisit({ preferredDate:'2026-08-30', alternativeDate:'' });
    expect(applyMessagingGuidedVisitHouseholdAnswer(timeDraft, '4')).toEqual({ kind:'ACCEPTED', patch:{ visit:{ preferredTime:'FLEXIBLE' } } });
    expect(applyMessagingGuidedVisitHouseholdAnswer(timeDraft, 'morning please').kind).toBe('INVALID');
    const flexibilityDraft = withVisit({ ...timeDraft.visit, preferredTime:'MORNING' });
    expect(applyMessagingGuidedVisitHouseholdAnswer(flexibilityDraft, '  within two hours  ')).toEqual({ kind:'ACCEPTED', patch:{ visit:{ flexibility:'within two hours' } } });
  });

  it('collects bounded access and conditional key handover details', () => {
    const draft = { visit: visitComplete(), access:{} } as any;
    expect(nextMessagingGuidedVisitHouseholdQuestion(draft)?.id).toBe('COMPLEX_ACCESS');
    expect(applyMessagingGuidedVisitHouseholdAnswer(draft, '3')).toEqual({ kind:'ACCEPTED', patch:{ access:{ complexAccess:'VISITOR_SIGN_IN' } } });
    const keyDraft = { visit:visitComplete(), access:{ complexAccess:'NOT_APPLICABLE', securityInstructions:'', parking:'' } } as any;
    expect(applyMessagingGuidedVisitHouseholdAnswer(keyDraft, '3')).toEqual({ kind:'ACCEPTED', patch:{ access:{ keyHandover:'TO_BE_ARRANGED' } } });
    const detailDraft = { ...keyDraft, access:{ ...keyDraft.access, keyHandover:'TO_BE_ARRANGED' } };
    expect(nextMessagingGuidedVisitHouseholdQuestion(detailDraft)?.id).toBe('KEY_HANDOVER_DETAILS');
    expect(applyMessagingGuidedVisitHouseholdAnswer(detailDraft, '  call me at the gate  ')).toEqual({ kind:'ACCEPTED', patch:{ access:{ keyHandoverDetails:'call me at the gate' } } });
  });

  it('collects presence and pet details without guessing', () => {
    const access = { complexAccess:'NOT_APPLICABLE', securityInstructions:'', parking:'', keyHandover:'SOMEONE_WILL_OPEN', someonePresent:false };
    const draft = { visit:visitComplete(), access, household:{} } as any;
    expect(nextMessagingGuidedVisitHouseholdQuestion(draft)?.id).toBe('HAS_PETS');
    expect(applyMessagingGuidedVisitHouseholdAnswer(draft, 'yes').kind).toBe('INVALID');
    expect(applyMessagingGuidedVisitHouseholdAnswer(draft, '1')).toEqual({ kind:'ACCEPTED', patch:{ household:{ hasPets:true } } });
    const petDraft = { ...draft, household:{ hasPets:true } };
    expect(nextMessagingGuidedVisitHouseholdQuestion(petDraft)?.id).toBe('PET_TYPE');
    expect(applyMessagingGuidedVisitHouseholdAnswer(petDraft, '  two dogs  ')).toEqual({ kind:'ACCEPTED', patch:{ household:{ petType:'two dogs' } } });
  });

  it('finishes only when visit, access and household required facts are complete', () => {
    const draft = { visit:visitComplete(), access:{ complexAccess:'NOT_APPLICABLE', securityInstructions:'', parking:'', keyHandover:'SOMEONE_WILL_OPEN', someonePresent:true }, household:{ hasPets:false } } as any;
    expect(nextMessagingGuidedVisitHouseholdQuestion(draft)).toBeNull();
    expect(applyMessagingGuidedVisitHouseholdAnswer(draft, 'anything')).toEqual({ kind:'COMPLETE' });
  });
});
