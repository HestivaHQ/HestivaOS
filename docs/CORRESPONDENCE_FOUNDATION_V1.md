# Customer Correspondence Foundation v1

## Status

ADR-0071 approves the Phase 2 correspondence architecture. Durable template/version persistence and the initial ADMIN-only management API are implemented by the current Phase 2 foundation slice. Rendered customer correspondence history/provenance is the next dependency-ready slice.

## Authority boundary

Correspondence owns business communication definitions and, in later slices, exact rendered communication/provenance. Messaging continues to own WhatsApp/Messenger conversation and provider-message history. Finance and operational domains remain authoritative for the facts that future correspondence renders.

Transport providers must consume authorized Correspondence state rather than own business wording, trigger decisions or business truth.

## Implemented template model

A `CorrespondenceTemplate` is a stable logical identity with a durable unique machine key, a human-readable name and immutable version history.

A `CorrespondenceTemplateVersion` contains subject/body source text and a monotonically increasing version number scoped to its template.

Version lifecycle is `DRAFT`, `PUBLISHED`, `RETIRED`. The database enforces at most one draft and one published version per template. Publishing a draft runs in a serializable transaction and atomically retires any previously published version for the same template. A published or retired version is never edited in place through the API; changes require a new draft.

The additive migration creates `correspondence_templates`, `correspondence_template_versions` and the `CorrespondenceTemplateVersionStatus` enum. Template/version history uses restrictive foreign-key deletion semantics so historical versions are not cascaded away with their logical template.

## Authorization and API boundary

Template management is ADMIN-only initially. The authenticated API supports:

- listing and reading templates with version history;
- creating a logical template with version 1 as a draft;
- creating the next draft version when no draft already exists;
- publishing a draft and retiring any prior published version atomically;
- retiring a currently published version.

No update/delete endpoint exists for published or retired template content.

## Deliberately deferred

This foundation does not approve actual customer-facing wording/tone, placeholder vocabulary, customer-specific rendering, rendered correspondence history/provenance, delivery channels/providers, delivery attempts/retries/failure state, automated triggers, duplicate-send prevention, human approval rules, payment links, or Finance-specific correspondence behavior.

No customer send is authorized by ADR-0071 or by the template/version runtime.