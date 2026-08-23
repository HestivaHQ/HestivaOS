# Messaging Quote State v1

## Status

This document describes the durable HestivaOS state boundary for an in-progress Messaging Quote conversation. The implementation is currently proposed on the stacked `feat/messaging-durable-quote-state` lane behind PR #194. It is not live or merged until the parent Quote-authority work and this slice both pass the repository merge process.

Coordination source: `HestivaHQ/HestivaOS#116`.

## Purpose

Messaging Foundation v1 requires a resumable Messaging Quote Draft so a WhatsApp or Messenger customer can answer Quote questions over time without creating an incomplete canonical Quote. This state is current workflow state, not immutable message history and not a second Quote domain.

HestivaOS remains authoritative for Quote validation, pricing, immutable Quote revisions, Quote status and accepted operational conversion. Messaging persists only the conversation-side facts and evidence needed to reach the existing Quote-domain boundary safely.

## Persistence

`MessagingConversation` owns the current Messaging Quote snapshot through:

- `quoteState` / database `quote_state`: nullable JSON containing the current versioned Quote workflow snapshot;
- `quoteStateVersion` / database `quote_state_version`: integer optimistic-concurrency revision, default `0`.

Migration: `20260821180500_messaging_quote_state`.

A conversation with `quote_state = NULL` and `quote_state_version = 0` is a valid fresh Quote state. Any other missing, malformed or version-inconsistent persisted state fails closed and requires recovery rather than being guessed or silently reset.

## Snapshot fields

The v1 snapshot stores:

- `version` — must equal the separate persisted `quote_state_version`;
- `draft` — partial `MessagingQuoteDraft`, which reuses the canonical Website Quote v2 business-fact groups without reusing the Website transport envelope;
- `humanReviewRequired` — pauses Quote automation when deterministic processing is unsafe;
- `reviewSummaryMessageId` — durable identity of the outbound review summary shown to the customer;
- `confirmationMessageId` — durable identity of the inbound customer confirmation;
- `confirmedAt` — occurrence time of that persisted inbound confirmation message;
- `submittedQuoteId` — canonical HestivaOS Quote identity after successful Quote-domain creation.

The flow phase is derived from the existing deterministic `evaluateMessagingQuoteFlow()` function rather than stored independently. Its current phases are `COLLECTING`, `REVIEW`, `READY_TO_SUBMIT`, `HUMAN_REVIEW`, and `SUBMITTED`.

## Review and confirmation integrity

A canonical Quote must not be created merely because all fact groups are present. The customer must first be shown a review summary and then explicitly confirm it.

The durable transition rules are:

1. a review summary can be recorded only when all required Messaging Quote fact groups have been collected and the flow is in `REVIEW`;
2. the review-summary message must be a persisted outbound `MessagingMessage` belonging to the same conversation;
3. customer confirmation can be recorded only after that review summary exists;
4. the confirmation must be a persisted inbound `MessagingMessage` belonging to the same conversation;
5. `confirmedAt` comes from the immutable inbound message `occurredAt`, not from a caller-supplied current clock;
6. any draft fact change after review clears the prior review and confirmation markers, forcing the changed facts to be reviewed and confirmed again;
7. entering human review also clears stale review/confirmation evidence;
8. a canonical Quote can be linked only from `READY_TO_SUBMIT` after explicit confirmation.

These rules prevent an old customer confirmation from authorizing a materially different draft.

## Concurrency and retry safety

Every state-changing operation requires an expected `quote_state_version`.

`MessagingQuoteStateService` re-reads the current state inside a serializable transaction and uses a compare-and-swap update constrained by the same expected version. A stale caller or concurrent writer receives a conflict and must reload rather than silently overwriting newer conversation facts.

Recording the same already-linked canonical Quote is idempotent. Attempting to link a different Quote after submission conflicts.

Quote creation itself retains the separate stable Messaging submission identity introduced by the parent Quote-authority slice. This state slice does not weaken or replace Quote-domain idempotency.

## Immutable history boundary

Messaging Quote state is mutable current workflow state. Existing `MessagingMessage` records remain immutable communication history.

The implementation does not store current Quote state in message metadata, Customer notes, synthetic provider messages, or other fields whose existing semantics would be changed. Review and confirmation message IDs are references to real persisted message evidence only.

## Submitted Quote changes

Once `submittedQuoteId` is present, draft mutation is rejected. Customer-requested changes to an already submitted Quote must use the canonical immutable Quote revision model; the Messaging draft is not an alternate mutable copy of a submitted Quote.

## Human review

`humanReviewRequired` moves the deterministic Messaging Quote flow to `HUMAN_REVIEW`. This state prevents the draft from becoming ready for automatic submission and deliberately invalidates stale review/confirmation evidence.

The operator attention surface and the deliberate hand-back mechanism remain separate implementation work. No unsupported fact, price, availability or business decision may be guessed merely to leave human review.

## Non-goals of this slice

This slice does not:

- automatically interpret inbound free text or introduce an AI provider;
- automatically create a canonical Quote from a webhook;
- call the Website Quote ingestion route or use the Website integration secret, Website submission identity, or `HESTIVA_WEBSITE` provenance;
- change Meta webhook authentication or provider adapters;
- create Customers or Properties early;
- implement submitted-Quote revision conversations;
- implement a general operator inbox or broad human takeover UI.

Those capabilities must cross their own bounded implementation and safety gates.

## Dependency and rollout

This slice is intentionally stacked on PR #194, which extracts the internal authoritative Quote submission service. It must not be merged independently ahead of that parent work.

After the parent PR merges, this lane must be synchronized with current `main`, migration/global-identifier collisions rechecked, the complete diff reviewed, and all required repository quality gates rerun on the exact final head before merge.
