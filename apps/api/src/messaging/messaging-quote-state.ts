import { ConflictException } from '@nestjs/common';
import type { MessagingQuoteDraft } from './messaging-quote-draft';
import { evaluateMessagingQuoteFlow, type MessagingQuoteFlowPhase } from './messaging-quote-flow';

export type MessagingQuoteStateSnapshot = {
  version: number;
  draft: Partial<MessagingQuoteDraft>;
  humanReviewRequired: boolean;
  reviewSummaryMessageId: string | null;
  confirmationMessageId: string | null;
  confirmedAt: string | null;
  submissionKey: string | null;
  submittedQuoteId: string | null;
};

export type MessagingQuoteStateView = MessagingQuoteStateSnapshot & {
  phase: MessagingQuoteFlowPhase;
};

export function initialMessagingQuoteState(): MessagingQuoteStateSnapshot {
  return {
    version: 0,
    draft: {},
    humanReviewRequired: false,
    reviewSummaryMessageId: null,
    confirmationMessageId: null,
    confirmedAt: null,
    submissionKey: null,
    submittedQuoteId: null,
  };
}

function optionalString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function parseMessagingQuoteStateSnapshot(
  value: unknown,
  persistedVersion: number,
): MessagingQuoteStateSnapshot {
  if (!Number.isInteger(persistedVersion) || persistedVersion < 0) {
    throw new ConflictException('Messaging Quote state version is invalid and requires recovery.');
  }
  if (value === null || value === undefined) {
    if (persistedVersion !== 0) {
      throw new ConflictException('Messaging Quote state payload is missing and requires recovery.');
    }
    return initialMessagingQuoteState();
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConflictException('Messaging Quote state payload is invalid and requires recovery.');
  }

  const candidate = value as Record<string, unknown>;
  const reviewSummaryMessageId = candidate.reviewSummaryMessageId;
  const confirmationMessageId = candidate.confirmationMessageId;
  const confirmedAt = candidate.confirmedAt;
  const submissionKey = candidate.submissionKey === undefined ? null : candidate.submissionKey;
  const submittedQuoteId = candidate.submittedQuoteId;
  if (
    candidate.version !== persistedVersion ||
    !Number.isInteger(candidate.version) ||
    !candidate.draft || typeof candidate.draft !== 'object' || Array.isArray(candidate.draft) ||
    typeof candidate.humanReviewRequired !== 'boolean' ||
    !optionalString(reviewSummaryMessageId) ||
    !optionalString(confirmationMessageId) ||
    !optionalString(confirmedAt) ||
    !optionalString(submissionKey) ||
    !optionalString(submittedQuoteId)
  ) {
    throw new ConflictException('Messaging Quote state payload is inconsistent and requires recovery.');
  }

  if ((confirmationMessageId === null) !== (confirmedAt === null)) {
    throw new ConflictException('Messaging Quote confirmation state is inconsistent and requires recovery.');
  }
  if (confirmedAt !== null && Number.isNaN(new Date(confirmedAt).getTime())) {
    throw new ConflictException('Messaging Quote confirmation timestamp is invalid and requires recovery.');
  }

  return {
    ...(candidate as unknown as Omit<MessagingQuoteStateSnapshot, 'submissionKey'>),
    submissionKey,
  };
}

function nextVersion(state: MessagingQuoteStateSnapshot): number {
  if (!Number.isInteger(state.version) || state.version < 0) {
    throw new ConflictException('Messaging Quote state version is invalid and requires recovery.');
  }
  return state.version + 1;
}

function customerConfirmed(state: MessagingQuoteStateSnapshot): boolean {
  return Boolean(state.confirmationMessageId && state.confirmedAt);
}

export function viewMessagingQuoteState(state: MessagingQuoteStateSnapshot): MessagingQuoteStateView {
  return {
    ...state,
    phase: evaluateMessagingQuoteFlow({
      draft: state.draft,
      humanReviewRequired: state.humanReviewRequired,
      customerConfirmed: customerConfirmed(state),
      submissionKey: state.submissionKey,
      submittedQuoteId: state.submittedQuoteId,
    }).phase,
  };
}

/**
 * Persisted Quote facts are mutable only before canonical Quote creation. Any
 * customer-visible review/confirmation becomes stale when those facts change,
 * so draft mutation deliberately clears both markers.
 */
export function updateMessagingQuoteDraft(
  state: MessagingQuoteStateSnapshot,
  patch: Partial<MessagingQuoteDraft>,
): MessagingQuoteStateSnapshot {
  if (state.submittedQuoteId) {
    throw new ConflictException('Submitted Messaging Quote facts must change through Quote revision, not draft mutation.');
  }
  if (state.submissionKey) {
    throw new ConflictException('Messaging Quote submission has started; reload the canonical Quote before changing facts.');
  }

  return {
    ...state,
    version: nextVersion(state),
    draft: { ...state.draft, ...patch },
    reviewSummaryMessageId: null,
    confirmationMessageId: null,
    confirmedAt: null,
  };
}

export function setMessagingQuoteHumanReview(
  state: MessagingQuoteStateSnapshot,
  required: boolean,
): MessagingQuoteStateSnapshot {
  if (state.submittedQuoteId && required) {
    throw new ConflictException('A submitted Messaging Quote cannot be returned to draft human review.');
  }
  if (state.submissionKey) {
    throw new ConflictException('Messaging Quote submission has started and cannot be moved back to draft human review.');
  }

  return {
    ...state,
    version: nextVersion(state),
    humanReviewRequired: required,
    ...(required
      ? { reviewSummaryMessageId: null, confirmationMessageId: null, confirmedAt: null }
      : {}),
  };
}

export function markMessagingQuoteReviewPresented(
  state: MessagingQuoteStateSnapshot,
  reviewSummaryMessageId: string,
): MessagingQuoteStateSnapshot {
  const messageId = reviewSummaryMessageId.trim();
  if (!messageId) throw new ConflictException('Messaging Quote review message identity is required.');
  if (viewMessagingQuoteState(state).phase !== 'REVIEW') {
    throw new ConflictException('Messaging Quote review can be recorded only after all required fact groups are collected.');
  }

  return {
    ...state,
    version: nextVersion(state),
    reviewSummaryMessageId: messageId,
    confirmationMessageId: null,
    confirmedAt: null,
  };
}

export function confirmMessagingQuoteReview(
  state: MessagingQuoteStateSnapshot,
  confirmationMessageId: string,
  confirmedAt: Date,
): MessagingQuoteStateSnapshot {
  const messageId = confirmationMessageId.trim();
  if (!state.reviewSummaryMessageId) {
    throw new ConflictException('Customer confirmation requires a recorded Quote review summary.');
  }
  if (viewMessagingQuoteState(state).phase !== 'REVIEW') {
    throw new ConflictException('Messaging Quote is not awaiting customer confirmation.');
  }
  if (!messageId || Number.isNaN(confirmedAt.getTime())) {
    throw new ConflictException('Valid customer confirmation message identity and timestamp are required.');
  }

  return {
    ...state,
    version: nextVersion(state),
    confirmationMessageId: messageId,
    confirmedAt: confirmedAt.toISOString(),
  };
}

export function beginMessagingQuoteSubmission(
  state: MessagingQuoteStateSnapshot,
  submissionKey: string,
): MessagingQuoteStateSnapshot {
  const key = submissionKey.trim();
  if (!key) throw new ConflictException('Messaging Quote submission identity is required.');

  const phase = viewMessagingQuoteState(state).phase;
  if (phase === 'SUBMITTING') {
    if (state.submissionKey === key) return state;
    throw new ConflictException('Messaging Quote submission is already reserved with a different identity.');
  }
  if (phase !== 'READY_TO_SUBMIT') {
    throw new ConflictException('Messaging Quote submission can start only after explicit customer confirmation.');
  }

  return {
    ...state,
    version: nextVersion(state),
    submissionKey: key,
  };
}

export function markMessagingQuoteSubmitted(
  state: MessagingQuoteStateSnapshot,
  quoteId: string,
): MessagingQuoteStateSnapshot {
  const canonicalQuoteId = quoteId.trim();
  if (!canonicalQuoteId) throw new ConflictException('Canonical Quote identity is required.');
  const phase = viewMessagingQuoteState(state).phase;
  if (phase === 'SUBMITTED') {
    if (state.submittedQuoteId === canonicalQuoteId) return state;
    throw new ConflictException('Messaging Quote state is already linked to a different canonical Quote.');
  }
  if (phase !== 'SUBMITTING' || !state.submissionKey) {
    throw new ConflictException('Messaging Quote can be linked only after a reserved submission starts.');
  }

  return {
    ...state,
    version: nextVersion(state),
    submittedQuoteId: canonicalQuoteId,
  };
}
