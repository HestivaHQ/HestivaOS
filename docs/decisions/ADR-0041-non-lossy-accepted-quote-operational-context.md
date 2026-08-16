# ADR-0041: Own accepted Quote operational context by lifecycle

- **Status:** Accepted
- **Date:** 2026-08-16

## Context

Atomic ONE_TIME and recurring acceptance retained several execution-critical Website values only on the immutable accepted Quote revision. Copying them into generic notes or permanent Property fields would lose semantics or incorrectly make visit-specific access data reusable.

## Decision

Keep the accepted `QuoteRevision` authoritative for commercial and source truth. Store typed visit context on `WorkOrder`; store only stable recurring instructions, preferred time and eco-product preference on `RecurringServiceAgreement`; never mutate a resolved existing Property during acceptance. Reference accepted-revision Quote photos through a dedicated Work Order join, separate from cleaner before/after photos.

Temporary credentials are separate Work-Order-owned records with credential type, validity, expiry, single-use and revocation metadata. They are neither Property access notes nor agreement instructions and are never inherited by recurring generation. The current Website contract supplies no typed credential, so acceptance does not parse one from prose.

## Consequences

Operations can execute the accepted initial visit without reopening the Website, while commercial history remains immutable and non-duplicated. Future recurring visits inherit only stable agreement context. Later APIs must apply role-aware credential value disclosure and may add WhatsApp ingestion without changing this ownership boundary.
