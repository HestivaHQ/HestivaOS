import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
} from '../quotes/website-quote-contract-v2';
import { WEBSITE_QUOTE_SOURCE } from '../quotes/website-quote-contract';
import {
  MESSAGING_QUOTE_REQUIRED_FACT_GROUPS,
  type MessagingQuoteDraft,
  type MessagingQuoteDraftProgress,
} from './messaging-quote-draft';

function validationOnlyEnvelope(draft: MessagingQuoteDraftProgress) {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION_V2,
    submissionId: '00000000-0000-4000-8000-000000000001',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-01-01T00:00:00.000Z',
    ...draft,
  };
}

export function messagingQuoteDraftValidationErrors(draft: MessagingQuoteDraftProgress) {
  return validateWebsiteQuoteSubmissionV2(validationOnlyEnvelope(draft));
}

export function messagingQuoteIncompleteFactGroups(
  draft: MessagingQuoteDraftProgress,
): Array<keyof MessagingQuoteDraft> {
  const errors = messagingQuoteDraftValidationErrors(draft);

  return MESSAGING_QUOTE_REQUIRED_FACT_GROUPS.filter((key) => {
    if (!Object.prototype.hasOwnProperty.call(draft, key) || draft[key] === undefined || draft[key] === null) {
      return true;
    }
    return errors.some((error) => error.path === key || error.path.startsWith(`${key}.`));
  });
}
