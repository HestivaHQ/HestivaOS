# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary. The canonical HestivaOS base-pricing calculator is now present, but new Quote persistence remains intentionally fail-closed until the universal break-even/contribution safeguard has authoritative operational cost inputs.

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

## Canonical pricing adapter

`website-quote-pricing.ts` translates only approved, sufficiently specified business rules into ZAR minor-unit line items. It uses the merged canonical pricing specification rather than website display prices or a second pricing engine.

Implemented deterministic pricing includes:

- Regular Home Cleaning floor-size ladder;
- Deep Cleaning floor-size ladder;
- Move-In / Move-Out shared floor-size ladder;
- standard Bathroom / Bedroom / Living Area component pricing where the current contract carries count information;
- Interior Window minimum component;
- structured Laundry v2 Wash, Dry & Fold / Wash & Hang / Ironing per-load pricing;
- Eco-Friendly preference at R0.

The adapter deliberately does not guess missing commercial facts. Post-Renovation remains assessment-priced. Kitchen requires Standard vs Deep/Detailed and size/workload detail. Generic appliance, balcony, garage, linen, window and other add-ons remain review-required when their canonical size/condition/workload variant is not represented by the current website payload. Open-ended counts and `from` prices also carry review reasons.

The superseded Post-Renovation R40/m² formula is not reinstated.

## Universal break-even boundary

The canonical specification requires every customer quote to pass a minimum-contribution / break-even safeguard including relevant labour, address-based deployment, consumables, equipment/vehicle reserve and overhead allocation.

Website Quote v1/v2 does not carry those authoritative internal cost inputs, and the current HestivaOS runtime does not yet expose a complete operational cost engine for this ingestion path. Therefore the pricing adapter always emits `BREAK_EVEN_REVIEW_REQUIRED` and the creation path remains gated rather than presenting a base catalogue subtotal as a commercially final quote.

This is a deliberate safety boundary. A canonical base-price calculation is not the same thing as proof that the final issued quote satisfies the approved profitability floor.

## Deliberate creation gate

A `NEW` request still returns `503 Service Unavailable` after authentication, contract validation and replay classification.

Persisting a Quote revision whose apparent total has not passed the mandatory break-even test could make an incomplete commercial price look final. The next runtime sub-slice must provide or connect the operational cost inputs, apply final upward-to-next-R10 rounding, and then create the Quote, immutable `CUSTOMER_SUBMISSION` revision, line items, activity and reference identity inside one database transaction.

Unique `Quote.submissionKey` remains the final concurrency/idempotency guard, with a concurrent winner re-read through the same replay/conflict semantics.

## Safety properties

- No unauthenticated website ingestion.
- No unsupported schema-version fallback.
- No partial persistence before final pricing is commercially valid.
- No zero-price placeholder Quote.
- No duplicate Quote on an identical replay.
- No silent overwrite when an idempotency identity conflicts.
- Structured Laundry v2 is validated before activation.
- Canonical catalogue prices are owned by HestivaOS.
- Missing pricing dimensions fail closed into review instead of being guessed.
- Post-Renovation assessment pricing remains intact.
- The mandatory break-even safeguard cannot be bypassed by catalogue pricing alone.
