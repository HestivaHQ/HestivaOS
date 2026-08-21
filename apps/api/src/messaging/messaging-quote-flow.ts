import {
  MESSAGING_QUOTE_REQUIRED_FACT_GROUPS,
  type MessagingQuoteDraft,
  type MessagingQuoteSection,
} from './messaging-quote-draft';

export type MessagingQuoteDraftProgress = Partial<MessagingQuoteDraft>;

export type MessagingQuoteFlowPhase =
  | 'COLLECTING'
  | 'REVIEW'
  | 'READY_TO_SUBMIT'
  | 'HUMAN_REVIEW'
  | 'SUBMITTED';

export type MessagingQuoteFlowState = {
  phase: MessagingQuoteFlowPhase;
  missingFactGroups: Array<keyof MessagingQuoteDraft>;
  nextSection: MessagingQuoteSection | null;
};

const FACT_GROUP_SECTION: Record<keyof MessagingQuoteDraft, MessagingQuoteSection> = {
  property: 'YOUR_HOME',
  request: 'CLEANING_REQUIREMENTS',
  visit: 'PREFERRED_VISIT',
  access: 'ACCESS_AND_HOUSEHOLD',
  household: 'ACCESS_AND_HOUSEHOLD',
  safety: 'ACCESS_AND_HOUSEHOLD',
  notes: 'PHOTOS_AND_NOTES',
  customer: 'YOUR_DETAILS',
  photos: 'PHOTOS_AND_NOTES',
};

function hasFactGroup(
  draft: MessagingQuoteDraftProgress,
  key: keyof MessagingQuoteDraft,
): boolean {
  return Object.prototype.hasOwnProperty.call(draft, key) && draft[key] !== undefined && draft[key] !== null;
}

/**
 * Pure conversation orchestration only. This function never prices, validates,
 * creates, revises, or accepts a Quote. Those remain authoritative Quote-domain
 * responsibilities.
 */
export function evaluateMessagingQuoteFlow(input: {
  draft: MessagingQuoteDraftProgress;
  humanReviewRequired?: boolean;
  customerConfirmed?: boolean;
  submittedQuoteId?: string | null;
}): MessagingQuoteFlowState {
  const missingFactGroups = MESSAGING_QUOTE_REQUIRED_FACT_GROUPS.filter(
    (key) => !hasFactGroup(input.draft, key),
  );

  if (input.submittedQuoteId) {
    return { phase: 'SUBMITTED', missingFactGroups, nextSection: null };
  }

  if (input.humanReviewRequired) {
    return { phase: 'HUMAN_REVIEW', missingFactGroups, nextSection: null };
  }

  if (missingFactGroups.length > 0) {
    return {
      phase: 'COLLECTING',
      missingFactGroups,
      nextSection: FACT_GROUP_SECTION[missingFactGroups[0]],
    };
  }

  if (!input.customerConfirmed) {
    return { phase: 'REVIEW', missingFactGroups: [], nextSection: 'REVIEW' };
  }

  return { phase: 'READY_TO_SUBMIT', missingFactGroups: [], nextSection: null };
}
