# Messaging Quote State v1

## Status

Messaging Quote persistence and resumable state were merged through PR #195. The current state boundary stores a resumable Quote draft, review/confirmation evidence and optimistic-concurrency version on `MessagingConversation`.

The Quote-domain submission authority was merged through PR #194. PR #197 connected a confirmed `READY_TO_SUBMIT` Messaging Quote to that shared authoritative Quote service without impersonating the Website integration.

PR #199 wired authenticated WhatsApp/Messenger inbound messages to the deterministic review/confirmation boundary. The current guided-collection slice extends `COLLECTING` with bounded Home/Property questions only; it still does not infer canonical Quote facts from arbitrary free text.

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
- `draft` — partial canonical Quote business-fact progress; nested fact groups may themselves be partial while deterministic questions are still being answered;
- `humanReviewRequired` — pauses Quote automation when deterministic processing is unsafe;
- `reviewSummaryMessageId` — durable identity of the outbound review summary shown to the customer;
- `confirmationMessageId` — durable identity of the inbound customer confirmation;
- `confirmedAt` — occurrence time of that persisted inbound confirmation message;
- `submissionKey` — stable Messaging Quote submission reservation once authoritative creation starts;
- `submittedQuoteId` — canonical HestivaOS Quote identity after successful Quote-domain creation.

Pre-reservation snapshots created by the already-merged v1 persistence slice do not contain `submissionKey`; they are read compatibly as `submissionKey = null`.

The flow phase is derived from `evaluateMessagingQuoteFlow()` rather than stored independently. Its phases are `COLLECTING`, `REVIEW`, `READY_TO_SUBMIT`, `SUBMITTING`, `HUMAN_REVIEW`, and `SUBMITTED`.

A fact group is no longer considered complete merely because its object exists. Completeness is derived from the canonical Quote v2 business-field validator, so partially collected or invalid nested groups remain in `COLLECTING` and cannot reach customer review as though they were complete.

## Guided collection integrity

Guided collection persists customer answers incrementally. Nested patches merge recursively with existing progress so a later answer cannot erase earlier facts in the same group.

The initial live guided slice covers the `YOUR_HOME` / Property fact group. It asks deterministic questions for supported property type, street address, suburb, South Africa confirmation, floor-size band, bedroom count, bathroom count, living-area count, apartment floor/access where required, outdoor area and estate/complex classification.

Safety rules are:

1. bounded categorical questions accept only the explicitly listed menu value;
2. street address and suburb are stored verbatim after trimming and are not semantically interpreted;
3. `Studio` is accepted only for an Apartment;
4. an Apartment floor must be an explicit whole number from 0 to 50;
5. South Africa is stored only after the customer replies exact `YES` to the country question;
6. a menu-like inbound answer is not interpreted unless the matching current question was already durably accepted by the provider;
7. invalid or ambiguous replies do not mutate Quote state and receive a deterministic retry prompt;
8. every prompt and retry uses a stable idempotency key and is persisted before provider delivery.

The remaining `CLEANING_REQUIREMENTS`, `PREFERRED_VISIT`, `ACCESS_AND_HOUSEHOLD`, `PHOTOS_AND_NOTES`, and `YOUR_DETAILS` guided sections remain follow-up slices. Until each section is implemented, its facts cannot be guessed merely to advance the flow.

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
8. authoritative creation begins only from `READY_TO_SUBMIT` after explicit confirmation;
9. creation first reserves a stable `submissionKey` and moves the conversation to `SUBMITTING`;
10. the canonical Quote is linked only after that reserved submission creates or safely replays the authoritative Quote.

These rules prevent an old customer confirmation from authorizing a materially different draft and prevent the draft from changing while a Quote is being created.

## Submission identity and authoritative creation

`MessagingQuoteSubmissionService` is the internal runtime boundary for a durable confirmed Messaging Quote.

The stable submission identity is derived from the normalized provider, HestivaOS conversation ID and immutable customer-confirmation message ID. The same confirmed conversation therefore produces the same key across retries.

The runtime sequence is:

1. load the exact persisted Quote state and require the caller's current `quote_state_version`;
2. require `READY_TO_SUBMIT` or a retryable `SUBMITTING` state;
3. re-run the deterministic Messaging Quote submission validation against the durable facts;
4. reserve the stable `submissionKey` before authoritative Quote creation;
5. call the shared `QuoteSubmissionService` with the canonical Quote fact groups;
6. use Messaging-specific replay resolution to distinguish a safe replay from conflicting immutable data;
7. record the returned canonical Quote ID in the Messaging state.

The Quote revision stores `source = HOMENT_MESSAGING`, `schemaVersion = MESSAGING_QUOTE_V1`, the canonical business facts, the confirmed submission time and Messaging provenance. It does not forge a Website submission ID, Website bearer credential or `HESTIVA_WEBSITE` provenance.

Pricing and operational-cost resolution remain owned by the existing Quote domain. The shared pricing/cost boundary consumes canonical Quote business facts rather than requiring a Website transport envelope.

## Concurrency, crash recovery and retry safety

Every state-changing operation requires an expected `quote_state_version`.

`MessagingQuoteStateService` re-reads the current state inside a serializable transaction and uses a compare-and-swap update constrained by the same expected version. A stale caller or concurrent writer receives a conflict and must reload rather than silently overwriting newer conversation facts.

The `SUBMITTING` reservation closes the gap between customer confirmation and canonical Quote linkage. Once a reservation exists:

- draft mutation is rejected;
- returning the Quote to draft human review is rejected;
- the same submission key may safely resume after a process/network failure;
- a different submission key conflicts;
- Quote-domain uniqueness/replay handling prevents duplicate canonical Quotes;
- after canonical creation/replay succeeds, the same Quote ID is linked into the conversation state.

An already `SUBMITTED` conversation returns its linked canonical Quote rather than creating another one. A missing or conflicting canonical linkage fails closed for recovery.

## Immutable history boundary

Messaging Quote state is mutable current workflow state. Existing `MessagingMessage` records remain immutable communication history.

The implementation does not store current Quote state in message metadata, Customer notes, synthetic provider messages, or other fields whose existing semantics would be changed. Review and confirmation message IDs are references to real persisted message evidence only.

## Submitted Quote changes

Once `submittedQuoteId` is present, draft mutation is rejected. Customer-requested changes to an already submitted Quote must use the canonical immutable Quote revision model; the Messaging draft is not an alternate mutable copy of a submitted Quote.

## Human review

`humanReviewRequired` moves the deterministic Messaging Quote flow to `HUMAN_REVIEW`. This state prevents the draft from becoming ready for submission and deliberately invalidates stale review/confirmation evidence.

The operator attention surface and deliberate hand-back mechanism remain separate implementation work. No unsupported fact, price, availability or business decision may be guessed merely to leave human review.

## Current live-orchestration boundary

Authenticated WhatsApp and Messenger inbound webhooks call `MessagingQuoteLiveOrchestratorService` only after provider authentication, normalized durable inbound persistence, and trusted-identity resolution.

The live deterministic behavior is intentionally bounded:

- `COLLECTING` can now drive the implemented guided Home/Property questions described above;
- arbitrary prose is not parsed into multiple Quote facts and AI is not used;
- when all canonical fact groups have eventually been collected and validated, `REVIEW` persists and sends one idempotent text summary of selected canonical facts;
- the summary explicitly instructs the customer to reply `CONFIRM` exactly;
- only a persisted inbound TEXT message whose trimmed content is exactly uppercase `CONFIRM` is accepted as Quote submission authorization;
- variants such as `confirm`, `yes`, `okay`, emojis, or longer sentences are not treated as authorization;
- after exact confirmation, the durable confirmation transition runs and the authoritative Quote submission runtime is invoked;
- if a prior attempt stopped after confirmation or during `SUBMITTING`, a later inbound event may safely resume the idempotent submission runtime;
- `HUMAN_REVIEW` and `SUBMITTED` states do not perform new automated Quote actions.

The review and guided prompt messages are durably persisted before provider delivery and use stable idempotency keys. Ambiguous provider-send outcomes remain pending reconciliation rather than causing duplicate business actions.

## Non-goals

This boundary does not:

- introduce an AI provider or allow AI to authorize business actions;
- infer multiple structured facts from arbitrary free text;
- claim that guided collection sections beyond Home/Property are implemented;
- call the Website Quote ingestion route or use the Website integration secret, Website submission identity, or `HESTIVA_WEBSITE` provenance;
- change Meta webhook authentication or provider adapters;
- create Customers or Properties early;
- implement submitted-Quote revision conversations;
- implement a general operator inbox or broad human takeover UI.

Those capabilities must cross their own bounded implementation and safety gates.
