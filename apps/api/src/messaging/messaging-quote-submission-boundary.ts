import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
} from '../quotes/website-quote-contract-v2';
import {
  WEBSITE_QUOTE_SOURCE,
  type WebsiteQuoteContractError,
} from '../quotes/website-quote-contract';
import {
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

function validationOnlyEnvelope(draft: MessagingQuoteDraftProgress) {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION_V2,
    submissionId: '00000000-0000-4000-8000-000000000001',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-01-01T00:00:00.000Z',
    ...draft,
  };
}

function everyTopLevelFactGroupPresent(draft: MessagingQuoteDraftProgress): boolean {
  return MESSAGING_QUOTE_REQUIRED_FACT_GROUPS.every(
    (key) => Object.prototype.hasOwnProperty.call(draft, key) && draft[key] !== undefined && draft[key] !== null,
  );
}

/**
 * Validate a completed Messaging Quote draft against the same canonical business
 * rules used by Quote contract v2 without reusing the Website transport route,
 * Website secret, Website submission identity, or Website provenance.
 *
 * The temporary Website transport fields below exist only to reuse the mature
 * business-field validator. They are never returned, persisted or treated as
 * provenance.
 */
export function prepareMessagingQuoteSubmission(input: {
  draft: MessagingQuoteDraftProgress;
  customerConfirmed?: boolean;
  humanReviewRequired?: boolean;
  submittedQuoteId?: string | null;
}): MessagingQuoteSubmissionBoundaryResult {
  const flow = evaluateMessagingQuoteFlow(input);

  if (flow.phase === 'HUMAN_REVIEW' || flow.phase === 'SUBMITTED' || flow.phase === 'SUBMITTING') {
    return { kind: 'NOT_READY', phase: flow.phase };
  }

  // A confirmed payload with every top-level fact group present is an attempted
  // complete submission. Preserve the existing fail-closed INVALID result when
  // its nested canonical facts are malformed rather than disguising it as an
  // ordinary still-collecting conversation.
  if (input.customerConfirmed && everyTopLevelFactGroupPresent(input.draft)) {
    const errors = validateWebsiteQuoteSubmissionV2(validationOnlyEnvelope(input.draft));
    if (errors.length > 0) return { kind: 'INVALID', errors };
  }

  if (flow.phase !== 'READY_TO_SUBMIT') {
    return { kind: 'NOT_READY', phase: flow.phase };
  }

  const draft = input.draft as MessagingQuoteDraft;
  const errors = validateWebsiteQuoteSubmissionV2(validationOnlyEnvelope(draft));
  if (errors.length > 0) return { kind: 'INVALID', errors };

  return { kind: 'READY', draft };
}
