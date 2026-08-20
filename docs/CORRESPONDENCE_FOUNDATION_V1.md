# Customer Correspondence Foundation v1

## Status

ADR-0071 approves the Phase 2 correspondence architecture. Runtime template/version persistence remains the immediate implementation slice; this document defines the boundary that implementation must satisfy.

## Authority boundary

Correspondence owns business communication definitions and, in later slices, exact rendered communication/provenance. Messaging continues to own WhatsApp/Messenger conversation and provider-message history. Finance and operational domains remain authoritative for the facts that future correspondence renders.

Transport providers must consume authorized Correspondence state rather than own business wording, trigger decisions or business truth.

## Approved template model

A `CorrespondenceTemplate` is a stable logical identity with a durable unique machine key, a human-readable name and immutable version history.

A `CorrespondenceTemplateVersion` contains subject/body source text and a monotonically increasing version number scoped to its template.

Version lifecycle is `DRAFT`, `PUBLISHED`, `RETIRED`. Publishing a draft atomically retires any previously published version for the same template. A published or retired version is never edited in place; changes require a new draft.

## Authorization

Template management is ADMIN-only initially: create template, create later draft version, publish draft, retire published version, and management reads.

## Deliberately deferred

This decision does not approve actual customer-facing wording/tone, placeholder vocabulary, customer-specific rendering, rendered correspondence history/provenance, delivery channels/providers, delivery attempts/retries/failure state, automated triggers, duplicate-send prevention, human approval rules, payment links, or Finance-specific correspondence behavior.

No customer send is authorized by ADR-0071.