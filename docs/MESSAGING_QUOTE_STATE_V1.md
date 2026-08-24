# Messaging Quote State v1

## Status

Messaging Quote persistence and resumable state were merged through PR #195. The current state boundary stores a resumable Quote draft, review/confirmation evidence and optimistic-concurrency version on `MessagingConversation`.

The Quote-domain submission authority was merged through PR #194. PR #197 connected a confirmed `READY_TO_SUBMIT` Messaging Quote to that shared authoritative Quote service without impersonating the Website integration.

PR #199 wired authenticated WhatsApp/Messenger inbound messages to the deterministic review/confirmation boundary. Subsequent merged Quote slices expanded deterministic guided collection beyond the original Home/Property-only checkpoint: current `main` includes guided Home/Property collection, Cleaning Requirements/Personalisation collection including the Post-Event extension, durable review/confirmation, and the review correction loop. This document preserves the earlier slice history below where useful but no longer describes Home/Property as the only implemented guided section.

ADR-0088 approves WhatsApp Flow as the **PLANNED primary** structured WhatsApp Quote presentation. The existing deterministic WhatsApp collector remains the **IMPLEMENTED fallback**, and the Messenger guided collector remains the **IMPLEMENTED provider-appropriate conversational path**. No Flow/session persistence or production Flow runtime is implemented by the ADR/documentation slice.

Coordination source: `HestivaHQ/HestivaOS#116`.

## Purpose

Messaging Foundation v1 requires resumable conversation-side Quote state so WhatsApp or Messenger customers can answer Quote questions over time without creating an incomplete canonical Quote. This state is current workflow state, not immutable message history and not a second Quote domain.

HestivaOS remains authoritative for Quote validation, pricing, immutable Quote revisions, Quote status and accepted operational conversion. Messaging persists only the conversation-side facts and evidence needed to reach the existing Quote-domain boundary safely.

The planned WhatsApp Flow is another presentation of these canonical business facts, not another Quote authority. Its future session/version state is deliberately not defined by this v1 persistence document until the Flow/session implementation slice.

## Persistence

`MessagingConversation` owns the current deterministic Messaging Quote snapshot through:

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

The deterministic guided flow phase is derived from `evaluateMessagingQuoteFlow()` rather than stored independently. Its phases are `COLLECTING`, `REVIEW`, `READY_TO_SUBMIT`, `SUBMITTING`, `HUMAN_REVIEW`, and `SUBMITTED`.

These are Messaging Quote workflow phases, not evidence that a future Meta Flow was `STARTED`, `VIEWED` or `ABANDONED`. ADR-0088 requires the future Flow lifecycle to record only provider/local facts that can actually be proved.

A fact group is no longer considered complete merely because its object exists. Completeness is derived from the canonical Quote v2 business-field validator, so partially collected or invalid nested groups remain in `COLLECTING` and cannot reach customer review as though they were complete.

## Guided collection integrity

Guided collection persists customer answers incrementally. Nested patches merge recursively with existing progress so a later answer cannot erase earlier facts in the same group.

The initial live guided slice covered `YOUR_HOME` / Property. Later merged slices added deterministic Cleaning Requirements/Personalisation handling, including the Post-Event Cleaning conditional extension. Current `main` orchestrates those implemented guided sections before review; sections not yet represented by a deterministic collector remain incomplete and cannot be guessed merely to advance the flow.

Safety rules include:

1. bounded categorical questions accept only the explicitly listed menu value;
2. street address and suburb are stored verbatim after trimming and are not semantically interpreted;
3. `Studio` is accepted only for an Apartment;
4. an Apartment floor must be an explicit whole number from 0 to 50;
5. South Africa is stored only after the customer replies exact `YES` to the country question;
6. a menu-like inbound answer is not interpreted unless the matching current question was already durably accepted by the provider;
7. invalid or ambiguous replies do not mutate Quote state and receive a deterministic retry prompt;
8. every prompt and retry uses a stable idempotency key and is persisted before provider delivery;
9. Post-Event follow-up facts are collected only when the Post-Event service path requires them; unsupported/unsafe combinations do not become guessed canonical facts.

The deterministic collector remains the WhatsApp fallback and Messenger conversational path after ADR-0088. It is not deleted merely because Flow becomes the planned primary WhatsApp presentation.

## Review and confirmation integrity

For the **implemented conversational guided collector**, a canonical Quote must not be created merely because all fact groups are present. The customer must first be shown a review summary and then explicitly confirm it.

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

ADR-0088 supersedes only this **presentation/confirmation mechanism** for the planned WhatsApp Flow path. A valid authenticated completion of the exact versioned Flow's own Review/Submit step is planned to be the explicit customer submission action; it must then enter the same HestivaOS validation, replay/idempotency and authoritative Quote-domain boundaries. Guided WhatsApp fallback and Messenger continue to use the conversational review/confirmation rules above.

## Submission identity and authoritative creation

`MessagingQuoteSubmissionService` is the internal runtime boundary for a durable confirmed Messaging Quote.

For the implemented conversational path, the stable submission identity is derived from the normalized provider, HestivaOS conversation ID and immutable customer-confirmation message ID. The same confirmed conversation therefore produces the same key across retries.

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

The future Flow path must preserve the same business-effect invariant: authenticated duplicate/retried completion delivery for one logical Flow submission must converge on exactly one canonical Quote or `HUMAN_REVIEW` result. Its exact submission/session identity is deferred to the Flow/session implementation slice.

## Concurrency, crash recovery and retry safety

Every current state-changing operation requires an expected `quote_state_version`.

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

## WhatsApp Flow session boundary — planned, not implemented

ADR-0088 requires a future Flow session to be durably bound to the exact provider Flow definition/version and HestivaOS mapping contract used for that launch. Old in-flight sessions must remain on their original version when a new Flow is deployed.

Unfinished Flow field progress is not assumed to survive leaving the Flow, returning to chat, restarting WhatsApp or temporary connectivity loss. Until an authenticated completion arrives, HestivaOS must not treat unsubmitted client-side values as durable Quote facts.

While an unresolved Flow session exists, ordinary WhatsApp chat remains available for customer questions and automated/human assistance. Ordinary chat messages must not accidentally enter the deterministic guided collector as Quote answers. A deliberate transition to fallback is required before the guided collector becomes answer-active.

The explicit fallback direction is:

**WhatsApp Flow -> deterministic guided WhatsApp collector -> Website Quote form where appropriate -> human assistance.**

Do not create durable `STARTED`, `VIEWED` or `ABANDONED` Flow events unless a future provider contract supplies trustworthy evidence for them. A locally recorded offer/send, authenticated completion, definite failure or local expiry/supersession may be represented only when the implementation can prove that event.

## Flow PhotoPicker boundary — planned, optional

PhotoPicker is planned optional Quote evidence capture and must be independently disableable. Its failure must not disable the core Flow.

Flow PhotoPicker media is not ordinary inbound WhatsApp image media. The future implementation must use the verified Flow-media retrieval/decryption/verification lifecycle and preserve ADR-0081's existing private-storage, replay-safety, no-temporary-URL and immutable-message-history principles before promoting media into canonical Quote-owned photo evidence.

PR #214 is not part of current `main` and is not treated as implemented state by this document.

## Submitted Quote changes

Once `submittedQuoteId` is present, draft mutation is rejected. Customer-requested changes to an already submitted Quote must use the canonical immutable Quote revision model; the Messaging draft is not an alternate mutable copy of a submitted Quote.

## Human review

`humanReviewRequired` moves the deterministic Messaging Quote flow to `HUMAN_REVIEW`. This state prevents the draft from becoming ready for submission and deliberately invalidates stale review/confirmation evidence.

The operator attention surface and deliberate hand-back mechanism remain separate implementation work. No unsupported fact, price, availability or business decision may be guessed merely to leave human review.

The planned Flow path ends at the same authoritative outcome boundary: unsupported, ambiguous or otherwise unsafe completed facts produce `HUMAN_REVIEW` rather than provider-side guessing.

## Current live-orchestration boundary

Authenticated WhatsApp and Messenger inbound webhooks call `MessagingQuoteLiveOrchestratorService` only after provider authentication, normalized durable inbound persistence, and trusted-identity resolution.

The current deterministic behavior includes:

- `COLLECTING` drives the implemented guided Home/Property and Cleaning Requirements/Personalisation collectors, including conditional Post-Event collection;
- arbitrary prose is not parsed into multiple Quote facts and AI is not used;
- when all canonical fact groups have been collected and validated, `REVIEW` persists and sends one idempotent text summary of selected canonical facts;
- the summary instructs the customer to reply `CONFIRM` exactly to submit or `CHANGE` exactly to enter the correction menu;
- only a persisted inbound TEXT message whose trimmed content is exactly uppercase `CONFIRM` is accepted as conversational Quote submission authorization;
- `CHANGE` opens a deterministic section-selection correction loop, and selecting a section clears that canonical group so it must be recollected and reviewed again;
- conversational variants such as `confirm`, `yes`, `okay`, emojis, or longer sentences are not treated as authorization;
- after exact confirmation, the durable confirmation transition runs and the authoritative Quote submission runtime is invoked;
- if a prior attempt stopped after confirmation or during `SUBMITTING`, a later inbound event may safely resume the idempotent submission runtime;
- `HUMAN_REVIEW` and `SUBMITTED` states do not perform new automated Quote actions.

The review and guided prompt messages are durably persisted before provider delivery and use stable idempotency keys. Ambiguous provider-send outcomes remain pending reconciliation rather than causing duplicate business actions.

WhatsApp Flow launch/session/completion routing is not implemented in current `main`; ADR-0088 records the approved next presentation direction only.

## Non-goals

This boundary does not:

- introduce an AI provider or allow AI to authorize business actions;
- infer multiple structured facts from arbitrary free text;
- claim every canonical guided section is implemented merely because the draft schema can represent it;
- implement WhatsApp Flow/session schema, Flow launch or Flow completion handling;
- call the Website Quote ingestion route or use the Website integration secret, Website submission identity, or `HESTIVA_WEBSITE` provenance;
- change Meta webhook authentication or provider adapters;
- create Customers or Properties early;
- implement submitted-Quote revision conversations;
- implement a general operator inbox or broad human takeover UI.

Those capabilities must cross their own bounded implementation and safety gates.
