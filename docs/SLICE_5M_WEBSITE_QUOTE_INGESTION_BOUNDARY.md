# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary. The canonical HestivaOS base-pricing calculator and the universal profitability-floor calculation are now present. New Quote persistence remains intentionally fail-closed until the ingestion path can obtain a complete authoritative operational-cost snapshot for the individual booking.

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

## Universal break-even / profitability floor

`quote-profitability.ts` now implements the approved universal economics rule without inventing business amounts.

A complete `QuoteOperationalCostSnapshot` must supply authoritative ZAR minor-unit amounts for:

- cleaner labour;
- address-based transport/deployment;
- chemicals/consumables;
- equipment/vehicle reserve;
- overhead allocation;
- required minimum contribution.

The engine rejects negative or fractional amounts. It calculates total operating cost, adds the required minimum contribution, compares that floor with the canonical catalogue subtotal, and raises the quote only where the catalogue subtotal would fall below the required floor. It never reduces an already-higher catalogue price.

After the profitability floor is applied, the final customer amount is rounded **upward to the next R10**, exactly matching the canonical rule. The rounding delta and profitability delta remain separately inspectable in the internal result.

No default cost values are embedded in code. Missing cost inputs remain a hard review/gating condition rather than silently becoming zero.

## Remaining operational-cost source

The current production `main` does not contain a complete authoritative cost-source path for quote ingestion. An older Worker Rates / Labour Costing PR exists historically but was closed without merge, and in any event it covered planned-shift labour rather than the full quote-level deployment, consumables, reserve, overhead and minimum-contribution snapshot required here.

Therefore the runtime must not pretend that those inputs already exist. The next integration step is to establish the authoritative source for the per-booking operational-cost snapshot, then pass that snapshot into `calculateWebsiteQuotePricing`.

When a complete snapshot is provided, the pricing adapter sets `requiresBreakEvenReview: false`, applies the profitability floor and upward R10 rounding, and returns the commercially protected total. Without it, `BREAK_EVEN_REVIEW_REQUIRED` remains present.

## Deliberate creation gate

A `NEW` request still returns `503 Service Unavailable` after authentication, contract validation and replay classification.

Persisting a Quote revision whose apparent total has not passed the mandatory break-even test could make an incomplete commercial price look final. Once the authoritative operational-cost source is connected, the NEW path can create the Quote, immutable `CUSTOMER_SUBMISSION` revision, line items, activity and reference identity inside one database transaction.

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
- Internal cost inputs are integer minor-unit values and may not silently default to zero.
- Final customer pricing rounds upward to the next R10 and never downward.
