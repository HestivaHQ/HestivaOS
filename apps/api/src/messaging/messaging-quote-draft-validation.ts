import { validateQuoteBusinessFacts } from '../quotes/quote-business-facts-validation';
import {
  MESSAGING_QUOTE_REQUIRED_FACT_GROUPS,
  type MessagingQuoteDraft,
  type MessagingQuoteDraftProgress,
} from './messaging-quote-draft';

export function messagingQuoteDraftValidationErrors(draft: MessagingQuoteDraftProgress) {
  return validateQuoteBusinessFacts(draft);
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
