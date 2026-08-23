import { createHash } from 'node:crypto';
import type {
  MessagingQuoteDraft,
  MessagingQuoteDraftProgress,
} from './messaging-quote-draft';
import { prepareMessagingQuoteSubmission } from './messaging-quote-submission-boundary';

export type MessagingQuoteCreationInput = {
  provider: string;
  conversationId: string;
  confirmationMessageId: string;
  confirmedAt: Date;
  draft: MessagingQuoteDraftProgress;
  customerConfirmed?: boolean;
  humanReviewRequired?: boolean;
  submittedQuoteId?: string | null;
};

export type PreparedMessagingQuoteCreation = {
  submissionKey: string;
  submittedAt: string;
  draft: MessagingQuoteDraft;
  provenance: {
    channel: 'MESSAGING';
    provider: string;
    conversationId: string;
    confirmationMessageId: string;
  };
};

/**
 * Build the stable identity used when a confirmed Messaging conversation is
 * handed to the authoritative Quote domain. The same provider conversation and
 * confirmation message always produce the same key, so retries cannot mint a
 * second logical Quote creation attempt.
 */
export function messagingQuoteSubmissionKey(input: {
  provider: string;
  conversationId: string;
  confirmationMessageId: string;
}): string {
  return `messaging:${createHash('sha256')
    .update(`${input.provider.trim().toLowerCase()}\n${input.conversationId}\n${input.confirmationMessageId}`)
    .digest('hex')}`;
}

export function prepareMessagingQuoteCreation(
  input: MessagingQuoteCreationInput,
):
  | { kind: 'READY'; value: PreparedMessagingQuoteCreation }
  | { kind: 'NOT_READY'; phase: string }
  | { kind: 'INVALID'; errors: Array<{ path: string; code: string; message: string }> } {
  const prepared = prepareMessagingQuoteSubmission({
    draft: input.draft,
    customerConfirmed: input.customerConfirmed,
    humanReviewRequired: input.humanReviewRequired,
    submittedQuoteId: input.submittedQuoteId,
  });

  if (prepared.kind !== 'READY') {
    return prepared;
  }

  return {
    kind: 'READY',
    value: {
      submissionKey: messagingQuoteSubmissionKey(input),
      submittedAt: input.confirmedAt.toISOString(),
      draft: prepared.draft,
      provenance: {
        channel: 'MESSAGING',
        provider: input.provider.trim().toLowerCase(),
        conversationId: input.conversationId,
        confirmationMessageId: input.confirmationMessageId,
      },
    },
  };
}
