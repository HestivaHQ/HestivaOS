# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary with canonical HestivaOS base pricing, the approved six-bucket cost model, universal profitability-floor calculation, atomic NEW Quote persistence, and an OpenRouteService-backed actual-road-distance source.

The runtime fails closed when required costing inputs or routing configuration are missing or invalid. A production website handoff smoke test has succeeded with the configured HestivaOS endpoint and routing prerequisites. The currently configured COIDA input is provisional for internal costing pending the business's authoritative Compensation Fund assessment; replacing that factual input remains an operational costing follow-up rather than a Website Quote or Laundry-contract implementation gap.

## Routing / deployment cost

The approved deployment cost remains **R1.82 per allocated planned road kilometre**.

`OpenRouteServiceAllocatedRouteDistanceResolver` obtains the one-way driving distance from OpenRouteService/HeiGIT using the configured deployment-base coordinates and the property coordinates carried by the Website Quote submission, then allocates the isolated round trip to the quote.

Quote-time allocation is conservative: until an actual multi-booking route plan exists, the booking is costed as an isolated **deployment base → property → deployment base** round trip. Later route clustering may improve realised economics but does not weaken the original quote profitability safeguard.

Required deployment configuration:

- `OPENROUTESERVICE_API_KEY`
- `HESTIVA_DEPLOYMENT_BASE_LATITUDE`
- `HESTIVA_DEPLOYMENT_BASE_LONGITUDE`

The resolver fails closed when configuration is missing or invalid, the Website payload has no valid coordinates, OpenRouteService cannot return a valid route distance, or the request fails. It never substitutes geometric/straight-line distance.

## COIDA

Labour requires a configured valid COIDA rate through `HESTIVA_COIDA_RATE`. The application does not infer an employer-specific rate from a generic public tariff. The production value used for the verified handoff is provisional for internal costing pending the authoritative Compensation Fund assessment and must be replaced when that assessment is known.

## Other implemented safeguards

The private Website ingestion endpoint retains bearer-secret authentication, v1/v2 contract validation, immutable replay/conflict classification, HestivaOS-owned canonical pricing, approved cleaner-hour cost formulas, the 20%/R100 contribution floor, upward-to-next-R10 customer-price rounding, and serializable atomic NEW persistence when every required cost component is available.

Missing commercial scope, cost inputs, route facts, or invalid configuration remain explicit review/gating conditions rather than being silently treated as zero or guessed.
