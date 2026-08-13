# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary with canonical HestivaOS base pricing, the approved six-bucket cost model, universal profitability-floor calculation, and atomic NEW Quote persistence code.

Production creation remains fail-closed until two factual deployment inputs are available at runtime:

1. the actual COIDA assessed rate; and
2. an authoritative allocated **actual-road route kilometre** resolver from the deployment base.

The code does not substitute zero or straight-line distance for either dependency.

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

## Approved six-bucket operational-cost model

`approved-quote-cost-model.ts` encodes the approved launch economics in ZAR minor units.

### 1. Labour

- Cleaner wage basis: **R33.27 per paid cleaner-hour**.
- Minimum engagement and approved cleaner-hour workload matrices remain business rules outside customer-facing time promises.
- Employer UIF: **1%** where applicable.
- SDL is not added in the launch model while the business is below the liability threshold.
- PAYE is withholding, not an additional employer wage cost.
- COIDA is included only when the actual assessed decimal rate is configured through `HESTIVA_COIDA_RATE`; absence keeps labour unresolved rather than treating COIDA as zero.
- The approved floor-size cleaner-hour matrices are encoded for Regular, Deep, Move-In and Move-Out through 220–299 m².
- The current Website contract's single `FROM_300_UP` band deliberately fails closed for cleaner-hour costing because the approved model distinguishes 300–349 m² from 350+ review.
- Component workload budgets are encoded only where the current structured payload carries enough information; ambiguous/open-ended workload inputs remain review-required.

### 2. Transport / deployment

- Internal variable deployment cost is **R1.82 per allocated planned route kilometre**.
- Distance must be actual road distance from the operating/deployment base, not straight-line distance.
- The provider therefore requires an authoritative allocated-route resolver. `UnavailableAllocatedRouteDistanceResolver` is intentionally installed until that routing-backed source is connected; it returns no amount and preserves explicit provenance.
- The R1.82/km rate already contains fuel plus vehicle maintenance reserve, so no second generic vehicle-maintenance charge is added in the equipment bucket.

### 3. Consumables

Approved v1 internal allowances:

- Regular Home Cleaning: **R10 + R2.50 per cleaner-hour**.
- Deep Cleaning: **R15 + R4.00 per cleaner-hour**.
- Move-In / Move-Out: **R20 + R4.50 per cleaner-hour**.
- Standard standalone/component: **R10 + R4.00 per cleaner-hour**.
- Heavy kitchen/bathroom work: **R10 + R5.00 per cleaner-hour**.
- Oven/severe grease: **R10 + R6.00 per cleaner-hour** when the future structured scope can distinguish that workload.

The current automatic adapter uses only categories the payload can determine without guessing. These are internal profitability costs, not customer-facing consumables charges.

### 4. Equipment / vehicle reserve

- Normal reusable cleaning equipment reserve: **R2.00 per planned cleaner-hour**.
- Specialist machinery remains service/job-specific rather than being socialised across all bookings.
- Equipment rental is a direct job cost when introduced.
- No duplicate generic vehicle reserve is added because transport already carries the approved fuel + maintenance benchmark.

### 5. Overhead

- Launch overhead allocation: **R20.00 per planned cleaner-hour**.
- This is based on the approved launch planning model of R5,000 monthly overhead divided by 250 productive cleaner-hours.
- It is a launch allocation, not a permanent economic constant; later operating history must recalibrate it.

### 6. Minimum contribution / profitability

- Automatic quotes require at least a **20% contribution margin on final selling price** after the first five operating-cost buckets.
- Because a 20% final-price margin is mathematically equivalent to contribution of 25% of pre-contribution operating cost, the resolver derives `minimumContributionMinor = ceil(costTotal / 4)`.
- An absolute **R100 minimum contribution per booking** also applies.
- The higher of the margin-derived amount and R100 is used.

The contribution component is derived only after labour, deployment, consumables, equipment reserve and overhead are all authoritative. Missing upstream costs therefore also keep contribution unresolved.

## Universal break-even / profitability floor

`quote-profitability.ts` receives a complete `QuoteOperationalCostSnapshot` containing:

- cleaner labour;
- address-based transport/deployment;
- chemicals/consumables;
- equipment/vehicle reserve;
- overhead allocation;
- required minimum contribution.

The engine rejects negative or fractional amounts. It calculates total operating cost, adds the required minimum contribution, compares that floor with the canonical catalogue subtotal, and raises the quote only where the catalogue subtotal would fall below the required floor. It never reduces an already-higher catalogue price.

After the profitability floor is applied, the final customer amount is rounded **upward to the next R10**. The rounding delta and profitability delta remain separately inspectable in the internal result.

## Operational-cost source layer

`quote-operational-cost-source.ts` defines the authoritative booking-level source boundary. A `QuoteOperationalCostProvider` receives the complete Website Quote submission and may return candidate values plus per-component provenance. The boundary validates all six required categories and returns only one of two outcomes:

- `READY` — every required amount is a non-negative integer ZAR minor-unit value;
- `NEEDS_ATTENTION` — at least one category is missing or invalid.

A missing provider value is never converted to zero. Negative and fractional amounts are rejected. Provenance is retained independently for each cost category.

`ApprovedQuoteOperationalCostProvider` now combines the approved business formulas with factual dependencies. It resolves cleaner-hour-driven labour/consumables/equipment/overhead, route-driven deployment, and then the contribution floor. Missing cleaner-hour precision, COIDA or route kilometres remains explicit.

`CompositeQuoteOperationalCostProvider` remains available when future authoritative subsystems supply individual categories independently.

## Atomic NEW Quote persistence

When the cost source returns `READY`, the ingestion service now calculates the authoritative pricing snapshot and creates the following in one serializable database transaction:

- `Quote` with `Q-YYYYMMDD-####` reference and database-unique website `submissionId` identity;
- immutable revision 1 with origin `CUSTOMER_SUBMISSION` and the complete structured Website payload;
- canonical pricing line items;
- a separate profitability-safeguard adjustment line where the catalogue subtotal had to be raised;
- `QUOTE_SUBMITTED` activity carrying cost provenance;
- `NEEDS_ATTENTION_SET` activity when deterministic pricing still carries review reasons.

A fully deterministic Quote receives `SUBMITTED`; a Quote with pricing review reasons receives `NEEDS_ATTENTION` while preserving its immutable submitted values and pricing snapshot.

The Quote validity boundary is 30 days from the Website `submittedAt` timestamp.

Database uniqueness on `Quote.submissionKey` remains the final concurrency boundary. If a concurrent request wins after the initial NEW classification, the loser catches the unique-key race, re-reads through the immutable replay resolver, and returns the winner for a true replay or rejects a conflict.

## Remaining activation blockers

The architecture and persistence path are now present. Production NEW creation remains intentionally unavailable while the default provider cannot resolve all required factual inputs.

### COIDA

Set the actual assessed COIDA decimal rate in the deployment configuration once established. Until then labour provenance records `coida-rate=unresolved` and the cost snapshot cannot become `READY`.

### Actual-road route distance

Connect an authoritative route-distance implementation that can calculate and allocate planned actual-road kilometres from the deployment base. The current Website payload's latitude/longitude cannot be converted to straight-line kilometres as a substitute because the approved business rule explicitly requires road distance and route allocation.

After these two factual dependencies are connected, sufficiently specified bookings can pass the six-bucket cost source and exercise the already-implemented atomic NEW persistence path without another pricing-architecture redesign.

## Safety properties

- No unauthenticated website ingestion.
- No unsupported schema-version fallback.
- No zero-price placeholder Quote.
- No duplicate Quote on an identical replay.
- No silent overwrite when an idempotency identity conflicts.
- Structured Laundry v2 is validated before activation.
- Canonical catalogue prices are owned by HestivaOS.
- Missing pricing dimensions fail closed instead of being guessed.
- Post-Renovation assessment pricing remains intact.
- The mandatory break-even safeguard cannot be bypassed by catalogue pricing alone.
- Missing operational-cost values remain unresolved rather than becoming zero.
- COIDA is not silently treated as zero when its assessed rate is not configured.
- Straight-line geographic distance is not substituted for required actual road distance.
- Cost-component provenance is retained for auditability.
- NEW persistence is atomic when activated.
- A concurrent duplicate is re-read and classified rather than creating a second Quote.
- Final customer pricing rounds upward to the next R10 and never downward.
