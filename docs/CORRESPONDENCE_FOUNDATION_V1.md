# Customer Correspondence Foundation v1

## Status

ADR-0071 approves the Phase 2 Correspondence ownership architecture. Durable template/version persistence and ADMIN-only management are implemented. ADR-0072 adds immutable rendered correspondence history/provenance as the next runtime layer. Delivery attempts/retries/failure state remain the next dependency-ready slice.

## Authority boundary

Correspondence owns business communication definitions and exact rendered communication/provenance. Messaging continues to own WhatsApp/Messenger conversation and provider-message history. Finance and operational domains remain authoritative for the facts that future correspondence renders.

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

## Authorization and API boundary

Template management and rendered-history access are ADMIN-only initially.

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

A rendered record is **not** a delivery attempt and does not mean anything was sent to a customer.

## Deliberately deferred

This foundation still does not approve actual customer-facing wording/tone, placeholder vocabulary, dynamic substitution, delivery channels/providers, delivery attempts/retries/failure state, automated triggers, duplicate-send prevention, human approval rules, payment links, or Finance-specific correspondence behavior.

The next Phase 2 slice is provider-neutral delivery-attempt/retry/failure state built against immutable `CorrespondenceRecord` history. No customer send is authorized merely by ADR-0071, ADR-0072 or the current Correspondence runtime.