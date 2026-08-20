# Customer Correspondence Foundation v1

## Status

ADR-0071 approves the Phase 2 Correspondence ownership architecture. Durable template/version persistence and ADMIN-only management are implemented. ADR-0072 adds immutable rendered correspondence history/provenance. ADR-0073 adds provider-neutral append-only delivery-attempt, retry and failure state without authorizing a live provider send.

## Authority boundary

Correspondence owns business communication definitions, exact rendered communication/provenance and provider-neutral outbound-attempt history. Messaging continues to own WhatsApp/Messenger conversation and provider-message history. Finance and operational domains remain authoritative for the facts that future correspondence renders.

Transport providers must consume authorized Correspondence state rather than own business wording, trigger decisions or business truth.

## Implemented template model

A `CorrespondenceTemplate` is a stable logical identity with a durable unique machine key, a human-readable name and immutable version history.

A `CorrespondenceTemplateVersion` contains subject/body source text and a monotonically increasing version number scoped to its template.

Version lifecycle is `DRAFT`, `PUBLISHED`, `RETIRED`. The database enforces at most one draft and one published version per template. Publishing and retiring run through serializable lifecycle transactions; publishing atomically retires any previously published version for the same template. A published or retired version is never edited in place through the API; changes require a new draft.

The additive template migration creates `correspondence_templates`, `correspondence_template_versions` and the `CorrespondenceTemplateVersionStatus` enum. Template/version history uses restrictive foreign-key deletion semantics so historical versions are not cascaded away with their logical template.

## Implemented rendered-history model

`CorrespondenceRecord` is append-only business-communication history. Each record:

- references the exact `CorrespondenceTemplateVersion` used;
- snapshots the template machine key and version number;
- persists the exact materialized subject/body;
- persists an opaque recipient snapshot;
- persists opaque business provenance plus a server-stamped materializing ADMIN identity snapshot;
- has a server timestamp and restrictive template-version deletion semantics.

Only a currently `PUBLISHED` template version can be materialized. No update/delete API exists for rendered records.

Placeholder/merge-field semantics are still unapproved. The v1 materializer therefore performs no substitution: it copies the published subject/body verbatim into the immutable record. This preserves exact output provenance without inventing template syntax ahead of product approval.

## Implemented delivery-attempt model

`CorrespondenceDeliveryAttempt` is append-only delivery-intent history anchored to one immutable `CorrespondenceRecord`.

Each attempt has a monotonic attempt number, an opaque route snapshot, and an optional pointer to the immediately previous failed attempt. A first attempt has no predecessor. A retry is a new row rather than a mutation of the failed attempt.

`CorrespondenceDeliveryAttemptEvent` stores immutable status history using `PENDING`, `ACCEPTED` and `FAILED`.

- creating an attempt atomically creates its initial `PENDING` event;
- one terminal `ACCEPTED` or `FAILED` event may later be appended;
- terminal attempts cannot receive another outcome;
- a retry is permitted only from the latest `FAILED` attempt for the same Correspondence record;
- retries cannot branch from one failed attempt;
- the database enforces one first attempt per record, unique attempt numbers, one successor per predecessor, one pending event and at most one terminal event.

Attempt creation and terminal-outcome recording use serializable transactions and server-stamp ADMIN identity snapshots into append-only event metadata. Provider references and failure details are event snapshots, not mutable Correspondence state.

`ACCEPTED` means only that a future adapter reported acceptance at its boundary. It does not mean final recipient delivery or read confirmation.

## Authorization and API boundary

Template management, rendered-history access and delivery-attempt state management are ADMIN-only initially.

Template API capabilities:

- list/read templates with version history;
- create a logical template with version 1 as a draft;
- create the next draft version when no draft already exists;
- publish a draft and retire any prior published version atomically;
- retire a currently published version.

Rendered-history API capabilities:

- materialize an immutable record from a published template version;
- list the newest 100 rendered records;
- read one rendered record by ID.

Delivery-state API capabilities:

- list the attempt/event chain for one Correspondence record;
- create the first provider-neutral attempt with an opaque route snapshot;
- create a retry only from the latest failed attempt;
- append one `ACCEPTED` or `FAILED` terminal outcome with provider/failure metadata.

No API in this foundation invokes a transport provider.

## Deliberately deferred

This foundation still does not approve actual customer-facing wording/tone, placeholder vocabulary, dynamic substitution, a delivery channel/provider, live sending, automatic retry timing/scheduling, provider-specific safe-retry rules, final-delivery/read tracking, automated triggers, duplicate-send prevention beyond the retry-chain invariants, human approval rules, payment links, or Finance-specific correspondence behavior.

The next Phase 2 slice is explicit human-approval boundaries where required, followed by approved event-driven Correspondence integration. Live transport remains a separate provider-specific decision and no customer send is authorized merely by ADR-0071, ADR-0072, ADR-0073 or the current Correspondence runtime.