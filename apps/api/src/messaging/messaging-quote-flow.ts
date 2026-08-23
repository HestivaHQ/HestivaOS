import {
  type MessagingQuoteDraft,
  type MessagingQuoteDraftProgress,
  type MessagingQuoteSection,
} from './messaging-quote-draft';
import { messagingQuoteIncompleteFactGroups } from './messaging-quote-draft-validation';

export type MessagingQuoteFlowPhase =
  | 'COLLECTING'
  | 'REVIEW'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTING'
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

/**
 * Pure conversation orchestration only. This function never prices, creates,
 * revises, or accepts a Quote. Completeness is derived from the canonical Quote
 * field validator so a partially collected object can never masquerade as a
 * complete fact group.
 */
export function evaluateMessagingQuoteFlow(input: {
  draft: MessagingQuoteDraftProgress;
  humanReviewRequired?: boolean;
  customerConfirmed?: boolean;
  submissionKey?: string | null;
  submittedQuoteId?: string | null;
}): MessagingQuoteFlowState {
  const missingFactGroups = messagingQuoteIncompleteFactGroups(input.draft);

  if (input.submittedQuoteId) {
    return { phase: 'SUBMITTED', missingFactGroups, nextSection: null };
  }

  if (input.submissionKey) {
    return { phase: 'SUBMITTING', missingFactGroups, nextSection: null };
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
