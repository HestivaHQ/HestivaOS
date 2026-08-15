# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary with canonical HestivaOS base pricing, the approved six-bucket cost model, universal profitability-floor calculation, atomic NEW Quote persistence, and an OpenRouteService-backed actual-road-distance source.

The runtime fails closed when required costing inputs or routing configuration are missing or invalid. A production website handoff smoke test has succeeded with the configured HestivaOS endpoint and routing prerequisites. The currently configured COIDA input is provisional for internal costing pending the business's authoritative Compensation Fund assessment; replacing that factual input remains an operational costing follow-up rather than a Website Quote or Laundry-contract implementation gap.

## Routing / deployment cost

The approved deployment cost remains **R1.82 per allocated planned road kilometre**.

`OpenRouteServiceAllocatedRouteDistanceResolver` obtains the one-way driving distance from OpenRouteService/HeiGIT using the configured deployment-base coordinates and the service property's coordinates, then allocates the isolated round trip to the quote.

Browser-provided property coordinates are preferred when present and valid. They are not required from the customer: when browser GPS is absent, HestivaOS geocodes the required service address (`addressLine1`, suburb, optional postal code, South Africa) server-side and uses the resolved property coordinates for road routing. This keeps quote submission independent of browser location permission and supports customers requesting a quote while physically away from the service property.

Quote-time allocation is conservative: until an actual multi-booking route plan exists, the booking is costed as an isolated **deployment base → property → deployment base** round trip. Later route clustering may improve realised economics but does not weaken the original quote profitability safeguard.

Required deployment configuration:

- `OPENROUTESERVICE_API_KEY`
- `HESTIVA_DEPLOYMENT_BASE_LATITUDE`
- `HESTIVA_DEPLOYMENT_BASE_LONGITUDE`

The resolver fails closed when configuration is missing or invalid, neither valid supplied property coordinates nor a geocodable service address can resolve the destination, OpenRouteService cannot return a valid route distance, or the request fails. It never substitutes geometric/straight-line distance or the customer's current device location for the service property.

## COIDA

Labour requires a configured valid COIDA rate through `HESTIVA_COIDA_RATE`. The application does not infer an employer-specific rate from a generic public tariff. The production value used for the verified handoff is provisional for internal costing pending the authoritative Compensation Fund assessment and must be replaced when that assessment is known.

## Other implemented safeguards

The private Website ingestion endpoint retains bearer-secret authentication, v1/v2 contract validation, immutable replay/conflict classification, HestivaOS-owned canonical pricing, approved cleaner-hour cost formulas, the 20%/R100 contribution floor, upward-to-next-R10 customer-price rounding, and serializable atomic NEW persistence when every required cost component is available.

Missing commercial scope, cost inputs, route facts, or invalid configuration remain explicit review/gating conditions rather than being silently treated as zero or guessed.
