# Website Quote Submission Contract v1

**Status:** Slice 5M-B implementation contract  
**Schema:** `1.0`  
**Authority:** HestivaOS Issue #73

The website email description is presentation only. Integration uses the versioned structured payload defined in `apps/api/src/quotes/website-quote-contract.ts`.

## Transport

- Server-to-server only; the browser never calls the private ingestion API.
- Planned runtime route: `POST /api/integrations/website/quotes`.
- Authentication: `Authorization: Bearer <HESTIVA_WEBSITE_INTEGRATION_SECRET>` from server-side secret stores only.
- `submissionId` is a UUID generated once by the website and reused unchanged for every retry. It maps to the durable unique Quote submission identity; it is not the public Quote reference.
- Same `submissionId` + same material payload returns the existing Quote/reference/pricing snapshot. Same ID + materially different payload is a conflict and creates nothing new.
- `401`/`403` are auth failures, invalid/unsupported payload is non-retryable `4xx`, temporary server/infrastructure failure is retryable `5xx` with the same `submissionId`.
- Customer-facing success happens only after HestivaOS returns the official `Q-YYYYMMDD-####` reference.

Slice 5M-B defines the contract but deliberately does not expose the ingestion controller before atomic Quote persistence and authoritative pricing are implemented together.

## Payload

`WebsiteQuoteSubmissionV1` contains `schemaVersion: "1.0"`, `submissionId`, `source: "HESTIVA_WEBSITE"`, canonical UTC `submittedAt`, and structured `customer`, `property`, `request`, `visit`, `access`, `household`, `safety`, `notes`, and `photos` objects.

Customer mobile is normalized to E.164 before reliable matching. Website sends customer facts, not a Customer ID; matching/creation occurs only in the later accepted-Quote handoff.

Property uses deterministic OS vocabulary. Bathrooms are only `ONE`/`TWO`/`THREE`/`FOUR`/`FIVE_PLUS`. Apartment/Townhouse submissions preserve `exactFloor` as integer 0–50 plus `buildingAccess`; the exact value must not later be collapsed into the older grouped floor enum.

Service rules:

- `Post-Renovation Cleaning` is a primary Service; `RECENTLY_RENOVATED` remains a separate Home Condition and may coexist.
- `Extra Refrigerator` and `Balcony / Patio Cleaning` support explicit positive-integer quantity; other v1 add-ons use quantity 1.
- Eco-friendly products is a boolean preference, not an add-on.
- `Add-on Services` and `Not sure` may carry their exact website label with `canonicalService: null`; that forces `NEEDS_ATTENTION` and blocks operational import until Admin resolves it.
- Unknown mappings fail closed; no fuzzy aliases and no parsing of email prose.
- `CUSTOM` frequency requires a note. Existing website service/frequency restrictions are enforced where current source proves them; no new restriction is fabricated for a newly introduced service without an approved rule.

Access, household, safety, damage, attention-area and quote-note values remain first-class provenance. Later handoff maps persistent facts to Property and visit-specific warnings to Work Order without silently overwriting existing Property data.

## Customer Quote Photos

V1 carries up to the website's current 10-photo bound. Each photo has stable `clientPhotoId`, file metadata, `sha256`, and base64 upload data. HestivaOS validates received bytes independently. Same ID + same hash reuses the stored evidence; same ID + different hash is a conflict. A failed photo does not discard a successfully persisted Quote; it creates a failed photo state and `NEEDS_ATTENTION`, and acceptance remains blocked until reconciliation.

## Authoritative pricing

The website does not own pricing rules. HestivaOS calculates pricing from the complete structured submission and atomically persists the snapshot with the Quote before returning success.

Pricing v1 uses `currency: "ZAR"`, integer-cent `subtotalMinor`, signed `adjustmentsMinor`, `totalMinor`, and line items containing stable `code`, human `label`, positive quantity, `unitAmountMinor`, and `lineAmountMinor`. Money never crosses the API as floating-point rand values.

The persisted snapshot is immutable against later pricing-rule changes. An idempotent replay returns the same snapshot without recalculation. Later Admin price changes create privileged audited revisions. VAT remains dormant internally and is omitted from the customer-facing v1 response while disabled.

## Success response

A successful creation or replay returns `schemaVersion`, `submissionId`, internal `quoteId`, official `quoteReference`, `quoteStatus` (`SUBMITTED` or `NEEDS_ATTENTION`), `created` (false on identical replay), and the authoritative pricing snapshot.

Validation/mapping errors use stable machine-readable codes plus field paths. If validation or pricing fails, no partial Quote or operational record may be created.

## Versioning

Additive optional fields may remain in v1. Removing/renaming fields or changing enum meaning requires a new major contract version and coordinated changes in both repositories.
