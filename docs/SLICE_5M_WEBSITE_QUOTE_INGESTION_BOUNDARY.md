# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary. New Quote creation remains intentionally fail-closed until the authoritative HestivaOS pricing calculator can populate the required immutable Quote revision totals and line items.

## Endpoint

`POST /api/integrations/website/quotes`

The endpoint is public only with respect to the normal Supabase user guard. It is not anonymous: every request must pass the dedicated Website integration bearer-secret verification implemented by `verifyWebsiteIntegrationAuthorization`.

## Contract handling

The runtime accepts the already-defined Website Quote contract v1 and structured-Laundry contract v2. Payloads are validated against the declared `schemaVersion` before any persistence decision.

## Replay semantics

The endpoint reuses the immutable Website submission replay resolver:

- `NEW`: no Quote currently owns the `submissionId`.
- `REPLAY`: the same immutable customer submission already exists; return its Quote identity without creating a duplicate.
- `CONFLICT`: the same `submissionId` is attached to materially different structured data; reject.
- `CORRUPT_EXISTING`: the existing Quote does not have exactly one immutable `CUSTOMER_SUBMISSION` revision; reject and require review.

Both v1 and v2 payloads use the same canonical fingerprint comparison.

## Deliberate creation gate

A `NEW` request currently returns `503 Service Unavailable` after authentication, contract validation and replay classification.

This is intentional. `QuoteRevision` requires authoritative financial totals, and HestivaOS is the approved pricing authority. Persisting a fake zero-value revision or accepting website-calculated prices would violate that boundary and could create an unsafe quote that later appears commercially valid.

The next Slice 5M sub-slice must provide the authoritative pricing result. Once available, the `NEW` path will create the Quote, its immutable `CUSTOMER_SUBMISSION` revision, line items, activity and reference identity inside one database transaction. Unique `Quote.submissionKey` remains the final concurrency/idempotency guard, with a concurrent winner re-read through the same replay/conflict semantics.

## Safety properties

- No unauthenticated website ingestion.
- No unsupported schema-version fallback.
- No partial persistence before pricing is available.
- No zero-price placeholder Quote.
- No duplicate Quote on an identical replay.
- No silent overwrite when an idempotency identity conflicts.
- Structured Laundry v2 is validated before activation.
