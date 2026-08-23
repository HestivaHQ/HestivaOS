# Messaging Cleaning Requirements v1

## Status

This document records the current deterministic Messaging Quote collection boundary for the base `CLEANING_REQUIREMENTS` section. It is a focused current-state companion to `MESSAGING_QUOTE_STATE_V1.md` and Issue #116. Once this slice is merged, any older Home-only wording in `MESSAGING_QUOTE_STATE_V1.md` about the extent of live guided collection is superseded by this focused document; the persistence, review, confirmation, submission and recovery rules in that document remain authoritative.

The implemented slice follows the merged Home/Property guided collection from PR #201. It does not replace HestivaOS Quote validation or pricing and does not create a Messaging-specific service catalogue.

A separate parallel lane, `feat/post-event-messaging-cleaning-requirements-v1`, owns Post-Event-specific conversational facts. This base slice deliberately does not duplicate or reinterpret that work.

## Collected facts

After the Home/Property questions are complete, authenticated trusted WhatsApp or Messenger Quote orchestration may collect these existing canonical `request` facts:

1. `request.primaryService` using the already-approved Website Quote service mapping;
2. `request.frequency` using the existing service-specific frequency rules;
3. `request.customFrequencyNote` as trimmed verbatim customer text only when `CUSTOM` frequency is selected;
4. `request.homeCondition` using the existing bounded home-condition vocabulary.

This slice stops before `PERSONALISE_SERVICE`. It does not collect add-ons, structured Laundry/Ironing quantities or `ecoFriendlyProducts`; those remain later guided work. Therefore completing these questions alone does not make the `request` fact group complete and cannot advance an otherwise incomplete Quote to review.

## Deterministic integrity rules

- Primary service and home condition accept only the displayed numbered choices.
- Primary-service values store the existing approved `websiteValue`/`canonicalService` mapping; Messaging does not infer a new canonical Service from customer prose.
- `Not sure` preserves the existing `websiteValue = "Not sure"`, `canonicalService = null` contract behavior.
- Frequency choices are derived from `allowedFrequenciesForCanonicalService()` rather than copied into a second business-rule table.
- A frequency that is not allowed for the selected canonical Service is rejected and does not mutate Quote state.
- For a canonical Service without an explicit restrictive frequency rule, the existing contract behavior remains unrestricted across the current canonical frequency vocabulary.
- A custom-frequency note is stored only as trimmed verbatim text; it is not semantically interpreted.
- As with Home/Property collection, a reply is not interpreted until the exact current outbound prompt has durable provider `ACCEPTED` evidence.
- Invalid or ambiguous replies do not mutate Quote state and receive an idempotent deterministic retry prompt.
- Prompt and retry messages are persisted before provider delivery and use stable idempotency keys.
- No AI or arbitrary free-text multi-fact extraction is introduced.

## Orchestration order

While a Messaging Quote is in `COLLECTING`:

1. unresolved Home/Property questions retain priority;
2. once Home/Property is complete, the base Cleaning Requirements questions run in order;
3. when these base questions are complete, orchestration stops at the next unimplemented guided section rather than guessing missing facts.

When the final Home answer is accepted, the first Cleaning Requirements prompt may be sent immediately using the updated Quote-state version. This preserves the same optimistic-concurrency and prompt-evidence model established by PR #201.

## Authority and non-goals

HestivaOS remains authoritative for Quote validation, service/frequency compatibility, pricing, immutable Quote revisions and operational conversion. Messaging only presents bounded questions and persists conversation-side progress.

This slice does not:

- implement Post-Event-specific workload questions;
- implement `PERSONALISE_SERVICE`, add-ons or structured Laundry/Ironing collection;
- implement Preferred Visit, Access/Household, Photos/Notes or Your Details;
- alter provider authentication, webhook normalization or transport policy;
- create Customers or Properties early;
- change pricing formulas or Work Order behavior;
- introduce AI or allow free text to authorize consequential business actions.

Coordination source: `HestivaHQ/HestivaOS#116`.
