import type { MessagingQuoteDraftProgress } from './messaging-quote-draft';
import {
  applyMessagingGuidedFinalDetailsAnswer,
  nextMessagingGuidedFinalDetailsQuestion,
  type MessagingGuidedFinalDetailsQuestion,
} from './messaging-quote-guided-final-details';

export type MessagingGuidedVisitHouseholdQuestionId =
  | 'PREFERRED_DATE' | 'ALTERNATIVE_DATE' | 'PREFERRED_TIME' | 'FLEXIBILITY' | 'URGENCY' | 'RECURRING_NOTES'
  | 'COMPLEX_ACCESS' | 'SECURITY_INSTRUCTIONS' | 'PARKING' | 'KEY_HANDOVER' | 'KEY_HANDOVER_DETAILS'
  | 'SOMEONE_PRESENT' | 'HAS_PETS' | 'PET_TYPE' | 'PET_TEMPERAMENT';
export type MessagingGuidedVisitHouseholdQuestion =
  | { id: MessagingGuidedVisitHouseholdQuestionId; text: string }
  | MessagingGuidedFinalDetailsQuestion;

const VISIT_HOUSEHOLD_QUESTION_IDS: readonly MessagingGuidedVisitHouseholdQuestionId[] = [
  'PREFERRED_DATE', 'ALTERNATIVE_DATE', 'PREFERRED_TIME', 'FLEXIBILITY', 'URGENCY', 'RECURRING_NOTES',
  'COMPLEX_ACCESS', 'SECURITY_INSTRUCTIONS', 'PARKING', 'KEY_HANDOVER', 'KEY_HANDOVER_DETAILS',
  'SOMEONE_PRESENT', 'HAS_PETS', 'PET_TYPE', 'PET_TEMPERAMENT',
];

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function nonEmpty(value: unknown): value is string { return typeof value === 'string' && Boolean(value.trim()); }
function calendarDate(value: string): boolean { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [y,m,d] = value.split('-').map(Number); const date = new Date(Date.UTC(y,m-1,d)); return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d; }
function optionalText(raw: string): string | null | undefined { const text = raw.trim(); if (text === '0') return null; return text || undefined; }

export function nextMessagingGuidedVisitHouseholdQuestion(draft: MessagingQuoteDraftProgress): MessagingGuidedVisitHouseholdQuestion | null {
  const visit = record(draft.visit);
  if (!nonEmpty(visit.preferredDate)) return { id: 'PREFERRED_DATE', text: 'What is your preferred cleaning date? Reply using YYYY-MM-DD only, for example 2026-08-30.' };
  if (!Object.prototype.hasOwnProperty.call(visit, 'alternativeDate')) return { id: 'ALTERNATIVE_DATE', text: 'Do you have an alternative date? Reply using YYYY-MM-DD, or 0 for none.' };
  if (!nonEmpty(visit.preferredTime)) return { id: 'PREFERRED_TIME', text: 'What time would you prefer?\n1. Morning\n2. Midday\n3. Afternoon\n4. Flexible\nReply with the number only.' };
  if (!nonEmpty(visit.flexibility)) return { id: 'FLEXIBILITY', text: 'How flexible are you on the visit date or time? Reply with a short note. Your words will be stored as written.' };
  if (!nonEmpty(visit.urgency)) return { id: 'URGENCY', text: 'How urgent is this cleaning? Reply with a short note. Your words will be stored as written.' };
  if (!Object.prototype.hasOwnProperty.call(visit, 'recurringNotes')) return { id: 'RECURRING_NOTES', text: 'Any recurring-schedule notes we should know? Reply with the note, or 0 for none.' };

  const access = record(draft.access);
  if (!nonEmpty(access.complexAccess)) return { id: 'COMPLEX_ACCESS', text: 'How will property or complex access work?\n1. Access code\n2. Not applicable\n3. Visitor sign-in\n4. Resident will arrange access\nReply with the number only.' };
  if (!Object.prototype.hasOwnProperty.call(access, 'securityInstructions')) return { id: 'SECURITY_INSTRUCTIONS', text: 'Any security or gate instructions? Reply with the instructions, or 0 for none.' };
  if (!Object.prototype.hasOwnProperty.call(access, 'parking')) return { id: 'PARKING', text: 'Any parking instructions for the cleaning team? Reply with the instructions, or 0 for none.' };
  if (!nonEmpty(access.keyHandover)) return { id: 'KEY_HANDOVER', text: 'How will we get access to the home?\n1. Someone will open\n2. Concierge / reception\n3. To be arranged\nReply with the number only.' };
  if (access.keyHandover === 'TO_BE_ARRANGED' && !nonEmpty(access.keyHandoverDetails)) return { id: 'KEY_HANDOVER_DETAILS', text: 'Please explain how the key or access handover should be arranged. Your answer will be stored as written.' };
  if (typeof access.someonePresent !== 'boolean') return { id: 'SOMEONE_PRESENT', text: 'Will someone be at the property during the cleaning?\n1. Yes\n2. No\nReply with the number only.' };

  const household = record(draft.household);
  if (typeof household.hasPets !== 'boolean') return { id: 'HAS_PETS', text: 'Are there pets at the property?\n1. Yes\n2. No\nReply with the number only.' };
  if (household.hasPets === true && !nonEmpty(household.petType)) return { id: 'PET_TYPE', text: 'What type of pet or pets are at the property? Your answer will be stored as written.' };
  if (household.hasPets === true && !nonEmpty(household.petTemperament)) return { id: 'PET_TEMPERAMENT', text: 'Briefly describe the pet temperament or anything the team should know. Your answer will be stored as written.' };
  return nextMessagingGuidedFinalDetailsQuestion(draft);
}

export type MessagingGuidedVisitHouseholdAnswer =
  | { kind: 'ACCEPTED'; patch: MessagingQuoteDraftProgress }
  | { kind: 'INVALID'; question: MessagingGuidedVisitHouseholdQuestion }
  | { kind: 'COMPLETE' };

export function applyMessagingGuidedVisitHouseholdAnswer(draft: MessagingQuoteDraftProgress, rawText: string | null | undefined): MessagingGuidedVisitHouseholdAnswer {
  const question = nextMessagingGuidedVisitHouseholdQuestion(draft); if (!question) return { kind: 'COMPLETE' };
  if (!VISIT_HOUSEHOLD_QUESTION_IDS.includes(question.id as MessagingGuidedVisitHouseholdQuestionId)) {
    return applyMessagingGuidedFinalDetailsAnswer(draft, rawText);
  }
  const text = rawText?.trim() ?? '';
  if (question.id === 'PREFERRED_DATE') { if (!calendarDate(text)) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { visit: { preferredDate: text } } }; }
  if (question.id === 'ALTERNATIVE_DATE') { if (text === '0') return { kind: 'ACCEPTED', patch: { visit: { alternativeDate: '' } } }; if (!calendarDate(text)) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { visit: { alternativeDate: text } } }; }
  if (question.id === 'PREFERRED_TIME') { const value = ({ '1':'MORNING','2':'MIDDAY','3':'AFTERNOON','4':'FLEXIBLE' } as const)[text as '1']; if (!value) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { visit: { preferredTime: value } } }; }
  if (question.id === 'FLEXIBILITY' || question.id === 'URGENCY') { if (!text) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { visit: { [question.id === 'FLEXIBILITY' ? 'flexibility' : 'urgency']: text } } }; }
  if (question.id === 'RECURRING_NOTES') { const value = optionalText(text); if (value === undefined) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { visit: { recurringNotes: value ?? '' } } }; }
  if (question.id === 'COMPLEX_ACCESS') { const value = ({ '1':'ACCESS_CODE','2':'NOT_APPLICABLE','3':'VISITOR_SIGN_IN','4':'RESIDENT_ARRANGED' } as const)[text as '1']; if (!value) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { access: { complexAccess: value } } }; }
  if (question.id === 'SECURITY_INSTRUCTIONS' || question.id === 'PARKING') { const value = optionalText(text); if (value === undefined) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { access: { [question.id === 'SECURITY_INSTRUCTIONS' ? 'securityInstructions' : 'parking']: value ?? '' } } }; }
  if (question.id === 'KEY_HANDOVER') { const value = ({ '1':'SOMEONE_WILL_OPEN','2':'CONCIERGE_RECEPTION','3':'TO_BE_ARRANGED' } as const)[text as '1']; if (!value) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { access: { keyHandover: value } } }; }
  if (question.id === 'KEY_HANDOVER_DETAILS') { if (!text) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { access: { keyHandoverDetails: text } } }; }
  if (question.id === 'SOMEONE_PRESENT') { if (text !== '1' && text !== '2') return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { access: { someonePresent: text === '1' } } }; }
  if (question.id === 'HAS_PETS') { if (text !== '1' && text !== '2') return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { household: { hasPets: text === '1' } } }; }
  if (question.id === 'PET_TYPE' || question.id === 'PET_TEMPERAMENT') { if (!text) return { kind: 'INVALID', question }; return { kind: 'ACCEPTED', patch: { household: { [question.id === 'PET_TYPE' ? 'petType' : 'petTemperament']: text } } }; }
  return { kind: 'INVALID', question };
}
