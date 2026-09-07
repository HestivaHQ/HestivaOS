import { validateQuoteBusinessFacts } from '../quotes/quote-business-facts-validation';
import type { WebsiteQuoteContractError } from '../quotes/website-quote-contract';
import {
  canonicalMessagingQuoteDraftProgress,
  MESSAGING_QUOTE_REQUIRED_FACT_GROUPS,
  type MessagingQuoteDraft,
  type MessagingQuoteDraftProgress,
} from './messaging-quote-draft';
import { evaluateMessagingQuoteFlow } from './messaging-quote-flow';

export type MessagingQuoteSubmissionBoundaryResult =
  | {
      kind: 'READY';
      draft: MessagingQuoteDraft;
    }
  | {
      kind: 'NOT_READY';
      phase: ReturnType<typeof evaluateMessagingQuoteFlow>['phase'];
    }
  | {
      kind: 'INVALID';
      errors: WebsiteQuoteContractError[];
    };

function everyTopLevelFactGroupPresent(draft: MessagingQuoteDraftProgress): boolean {
  return MESSAGING_QUOTE_REQUIRED_FACT_GROUPS.every(
    (key) => Object.prototype.hasOwnProperty.call(draft, key) && draft[key] !== undefined && draft[key] !== null,
  );
}

/**
 * Validate a completed Messaging Quote draft against channel-neutral canonical
 * business rules. Website transport identity, secrets, submission IDs and
 * provenance are not reused by this boundary. Messaging-only secured-media
 * references are deliberately stripped before shared Quote validation.
 */
export function prepareMessagingQuoteSubmission(input: {
  draft: MessagingQuoteDraftProgress;
  customerConfirmed?: boolean;
  humanReviewRequired?: boolean;
  submittedQuoteId?: string | null;
}): MessagingQuoteSubmissionBoundaryResult {
  const canonicalDraft = canonicalMessagingQuoteDraftProgress(input.draft);
  const flow = evaluateMessagingQuoteFlow({ ...input, draft: canonicalDraft });

  if (flow.phase === 'HUMAN_REVIEW' || flow.phase === 'SUBMITTED' || flow.phase === 'SUBMITTING') {
    return { kind: 'NOT_READY', phase: flow.phase };
  }

  // A confirmed payload with every top-level fact group present is an attempted
  // complete submission. Preserve fail-closed INVALID behavior when nested
  // canonical facts are malformed rather than disguising it as still collecting.
  if (input.customerConfirmed && everyTopLevelFactGroupPresent(canonicalDraft)) {
    const errors = validateQuoteBusinessFacts(canonicalDraft);
    if (errors.length > 0) return { kind: 'INVALID', errors };
  }

  if (flow.phase !== 'READY_TO_SUBMIT') {
    return { kind: 'NOT_READY', phase: flow.phase };
  }

  const draft = canonicalDraft as MessagingQuoteDraft;
  const errors = validateQuoteBusinessFacts(draft);
  if (errors.length > 0) return { kind: 'INVALID', errors };

  return { kind: 'READY', draft };
}
