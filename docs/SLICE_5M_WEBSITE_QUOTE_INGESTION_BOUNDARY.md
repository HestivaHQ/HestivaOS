# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary. The canonical HestivaOS base-pricing calculator, universal profitability-floor calculation and fail-closed operational-cost source layer are now present. New Quote persistence remains intentionally gated until real authoritative component resolvers are connected for the individual booking.

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

`quote-profitability.ts` implements the approved universal economics rule without inventing business amounts.

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

## Operational-cost source layer

`quote-operational-cost-source.ts` defines the authoritative booking-level source boundary. A `QuoteOperationalCostProvider` receives the complete Website Quote submission and may return candidate values plus per-component provenance. The boundary validates all six required categories and returns only one of two outcomes:

- `READY` — every required amount is a non-negative integer ZAR minor-unit value;
- `NEEDS_ATTENTION` — at least one category is missing or invalid.

A missing provider value is never converted to zero. Negative and fractional amounts are rejected. Provenance is retained independently for each cost category so later audit/persistence can show where labour, deployment, consumables, reserve, overhead and contribution values came from.

`CompositeQuoteOperationalCostProvider` composes independent resolvers for the six categories. This lets HestivaOS connect each category to its proper authoritative subsystem instead of creating one opaque pricing blob. The composite provider preserves unresolved values as unresolved and does not own any business formula itself.

This design deliberately separates three responsibilities:

1. canonical catalogue pricing decides what the service itself costs;
2. operational cost sources provide internal booking economics;
3. the profitability engine protects the final customer price against the approved minimum floor and performs upward R10 rounding.

## Remaining component resolvers

The source layer is now implemented, but actual production resolvers still need authoritative business inputs. Current `main` does not contain complete approved sources for all six categories. An older Worker Rates / Labour Costing PR was closed without merge and covered planned-shift labour only, so it is not treated as a substitute.

No cost category will be fabricated merely to activate ingestion. The next implementation step is to connect real labour, address-based deployment, consumables, reserve, overhead and minimum-contribution resolver inputs, then feed the resulting `READY` snapshot into `calculateWebsiteQuotePricing`.

## Deliberate creation gate

A `NEW` request still returns `503 Service Unavailable` after authentication, contract validation and replay classification.

Persisting a Quote revision whose apparent total has not passed the mandatory break-even test could make an incomplete commercial price look final. Once the authoritative component resolvers produce a complete operational-cost snapshot, the NEW path can create the Quote, immutable `CUSTOMER_SUBMISSION` revision, line items, activity and reference identity inside one database transaction.

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
- Missing operational-cost component values remain unresolved rather than becoming zero.
- Cost-component provenance can be retained independently for auditability.
- Final customer pricing rounds upward to the next R10 and never downward.
