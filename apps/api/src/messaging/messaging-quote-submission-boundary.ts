import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
} from '../quotes/website-quote-contract-v2';
import {
  WEBSITE_QUOTE_SOURCE,
  type WebsiteQuoteContractError,
} from '../quotes/website-quote-contract';
import type {
  MessagingQuoteDraft,
  MessagingQuoteDraftProgress,
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

/**
 * Validate a completed Messaging Quote draft against the same canonical business
 * rules used by Quote contract v2 without reusing the Website transport route,
 * Website secret, Website submission identity, or Website provenance.
 *
 * The temporary Website transport fields below exist only to reuse the mature
 * business-field validator. They are never returned, persisted or treated as
 * provenance. A later Quote-domain application service must own pricing and
 * canonical Quote creation.
 */
export function prepareMessagingQuoteSubmission(input: {
  draft: MessagingQuoteDraftProgress;
  customerConfirmed?: boolean;
  humanReviewRequired?: boolean;
  submittedQuoteId?: string | null;
}): MessagingQuoteSubmissionBoundaryResult {
  const flow = evaluateMessagingQuoteFlow(input);

  if (flow.phase !== 'READY_TO_SUBMIT') {
    return { kind: 'NOT_READY', phase: flow.phase };
  }

  const draft = input.draft as MessagingQuoteDraft;
  const validationOnlyEnvelope = {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION_V2,
    submissionId: '00000000-0000-4000-8000-000000000001',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-01-01T00:00:00.000Z',
    ...draft,
  };
  const errors = validateWebsiteQuoteSubmissionV2(validationOnlyEnvelope);

  if (errors.length > 0) {
    return { kind: 'INVALID', errors };
  }

  return { kind: 'READY', draft };
}
