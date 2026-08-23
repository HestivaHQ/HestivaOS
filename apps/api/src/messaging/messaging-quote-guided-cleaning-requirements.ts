import { allowedFrequenciesForCanonicalService } from '../quotes/website-quote-contract';
import type { MessagingQuoteDraftProgress } from './messaging-quote-draft';

export type MessagingGuidedCleaningQuestionId =
  | 'PRIMARY_SERVICE'
  | 'FREQUENCY'
  | 'CUSTOM_FREQUENCY_NOTE'
  | 'HOME_CONDITION';

export type MessagingGuidedCleaningQuestion = {
  id: MessagingGuidedCleaningQuestionId;
  text: string;
};

const PRIMARY_SERVICES = {
  '1': { websiteValue: 'Regular Home Cleaning', canonicalService: 'Regular Home Cleaning' },
  '2': { websiteValue: 'Deep Cleaning', canonicalService: 'Deep Cleaning' },
  '3': { websiteValue: 'Move-In Cleaning', canonicalService: 'Move-In Cleaning' },
  '4': { websiteValue: 'Move-Out Cleaning', canonicalService: 'Move-Out Cleaning' },
  '5': { websiteValue: 'Apartment Cleaning', canonicalService: 'Apartment Cleaning' },
  '6': { websiteValue: 'Kitchen Cleaning', canonicalService: 'Kitchen Cleaning' },
  '7': { websiteValue: 'Bathroom Sanitisation', canonicalService: 'Bathroom Sanitisation' },
  '8': { websiteValue: 'Bedroom Cleaning', canonicalService: 'Bedroom Cleaning' },
  '9': { websiteValue: 'Living Area Cleaning', canonicalService: 'Living Area Cleaning' },
  '10': { websiteValue: 'Interior Window Cleaning', canonicalService: 'Interior Window Cleaning' },
  '11': { websiteValue: 'Laundry Folding', canonicalService: 'Laundry Folding' },
  '12': { websiteValue: 'Eco-Friendly Cleaning', canonicalService: 'Eco-Conscious Cleaning' },
  '13': { websiteValue: 'Post-Renovation Cleaning', canonicalService: 'Post-Renovation Cleaning' },
  '14': { websiteValue: 'Not sure', canonicalService: null },
} as const;

const FREQUENCIES = {
  '1': 'ONE_TIME',
  '2': 'WEEKLY',
  '3': 'EVERY_TWO_WEEKS',
  '4': 'MONTHLY',
  '5': 'CUSTOM',
} as const;

type FrequencyValue = (typeof FREQUENCIES)[keyof typeof FREQUENCIES];

const FREQUENCY_LABELS: Record<FrequencyValue, string> = {
  ONE_TIME: 'One time',
  WEEKLY: 'Weekly',
  EVERY_TWO_WEEKS: 'Every two weeks',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom schedule',
};

const HOME_CONDITIONS = {
  '1': 'LIGHT_UPKEEP',
  '2': 'STANDARD',
  '3': 'EXTRA_ATTENTION',
  '4': 'HEAVY_BUILDUP',
  '5': 'RECENTLY_RENOVATED',
  '6': 'VACANT',
  '7': 'MOVE_IN_OUT',
} as const;

function requestProgress(draft: MessagingQuoteDraftProgress): Record<string, unknown> {
  const value = draft.request;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function primaryProgress(request: Record<string, unknown>): Record<string, unknown> {
  const value = request.primaryService;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function allowedFrequencyValues(canonicalService: string | null): readonly FrequencyValue[] {
  return allowedFrequenciesForCanonicalService(canonicalService) ?? Object.values(FREQUENCIES);
}

function frequencyQuestion(canonicalService: string | null): MessagingGuidedCleaningQuestion {
  const allowed = allowedFrequencyValues(canonicalService);
  const lines = Object.entries(FREQUENCIES)
    .filter(([, value]) => allowed.includes(value))
    .map(([number, value]) => `${number}. ${FREQUENCY_LABELS[value]}`);
  return {
    id: 'FREQUENCY',
    text: `How often would you like this cleaning?\n${lines.join('\n')}\nReply with the number only.`,
  };
}

export function nextMessagingGuidedCleaningQuestion(
  draft: MessagingQuoteDraftProgress,
): MessagingGuidedCleaningQuestion | null {
  const request = requestProgress(draft);
  const primary = primaryProgress(request);

  if (!Object.prototype.hasOwnProperty.call(primary, 'canonicalService') || !nonEmptyString(primary.websiteValue)) {
    return {
      id: 'PRIMARY_SERVICE',
      text: 'Which cleaning service do you need?\n1. Regular Home Cleaning\n2. Deep Cleaning\n3. Move-In Cleaning\n4. Move-Out Cleaning\n5. Apartment Cleaning\n6. Kitchen Cleaning\n7. Bathroom Sanitisation\n8. Bedroom Cleaning\n9. Living Area Cleaning\n10. Interior Window Cleaning\n11. Laundry Folding\n12. Eco-Friendly Cleaning\n13. Post-Renovation Cleaning\n14. Not sure\nReply with the number only.',
    };
  }

  const canonicalService = typeof primary.canonicalService === 'string' ? primary.canonicalService : null;
  if (!request.frequency) return frequencyQuestion(canonicalService);

  if (request.frequency === 'CUSTOM' && !nonEmptyString(request.customFrequencyNote)) {
    return {
      id: 'CUSTOM_FREQUENCY_NOTE',
      text: 'Please describe the cleaning schedule you need. Reply with the schedule only.',
    };
  }

  if (!request.homeCondition) {
    return {
      id: 'HOME_CONDITION',
      text: 'How would you describe the current condition?\n1. Light upkeep\n2. Standard cleaning\n3. Needs extra attention\n4. Heavy buildup\n5. Recently renovated\n6. Vacant\n7. Move-in or move-out condition\nReply with the number only.',
    };
  }

  return null;
}

export type MessagingGuidedCleaningAnswer =
  | { kind: 'ACCEPTED'; patch: MessagingQuoteDraftProgress }
  | { kind: 'INVALID'; question: MessagingGuidedCleaningQuestion }
  | { kind: 'COMPLETE' };

export function applyMessagingGuidedCleaningAnswer(
  draft: MessagingQuoteDraftProgress,
  rawText: string | null | undefined,
): MessagingGuidedCleaningAnswer {
  const question = nextMessagingGuidedCleaningQuestion(draft);
  if (!question) return { kind: 'COMPLETE' };

  const text = rawText?.trim() ?? '';
  const request = requestProgress(draft);
  const primary = primaryProgress(request);

  if (question.id === 'PRIMARY_SERVICE') {
    const value = PRIMARY_SERVICES[text as keyof typeof PRIMARY_SERVICES];
    return value
      ? { kind: 'ACCEPTED', patch: { request: { primaryService: { ...value } } } }
      : { kind: 'INVALID', question };
  }

  if (question.id === 'FREQUENCY') {
    const value = FREQUENCIES[text as keyof typeof FREQUENCIES];
    const canonicalService = typeof primary.canonicalService === 'string' ? primary.canonicalService : null;
    const allowed = allowedFrequencyValues(canonicalService);
    if (!value || !allowed.includes(value)) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { request: { frequency: value } } };
  }

  if (question.id === 'CUSTOM_FREQUENCY_NOTE') {
    return text
      ? { kind: 'ACCEPTED', patch: { request: { customFrequencyNote: text } } }
      : { kind: 'INVALID', question };
  }

  const value = HOME_CONDITIONS[text as keyof typeof HOME_CONDITIONS];
  return value
    ? { kind: 'ACCEPTED', patch: { request: { homeCondition: value } } }
    : { kind: 'INVALID', question };
}
