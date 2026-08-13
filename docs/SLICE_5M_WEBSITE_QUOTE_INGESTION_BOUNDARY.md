# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary with canonical HestivaOS base pricing, the approved six-bucket cost model, universal profitability-floor calculation, atomic NEW Quote persistence code, and a Google Routes-backed actual-road-distance source.

Production NEW creation remains fail-closed until the actual assessed COIDA rate is configured. Routing also requires its API credential and deployment-base coordinates to be configured; missing routing configuration remains unresolved rather than falling back to straight-line distance.

## Routing / deployment cost

The approved deployment cost remains **R1.82 per allocated planned road kilometre**.

`GoogleRoutesAllocatedRouteDistanceResolver` obtains driving `distanceMeters` from Google Routes API using the configured deployment-base coordinates and the property coordinates carried by the Website Quote submission.

Quote-time allocation is conservative: until an actual multi-booking route plan exists, the booking is costed as an isolated **deployment base → property → deployment base** round trip. Later route clustering may improve realised economics but does not weaken the original quote profitability safeguard.

Required deployment configuration:

- `GOOGLE_MAPS_ROUTES_API_KEY`
- `HESTIVA_DEPLOYMENT_BASE_LATITUDE`
- `HESTIVA_DEPLOYMENT_BASE_LONGITUDE`

The resolver fails closed when configuration is missing or invalid, the Website payload has no coordinates, Google cannot return a route, or the request fails. It never substitutes geometric/straight-line distance.

## COIDA

Labour continues to require the business's actual assessed COIDA rate through `HESTIVA_COIDA_RATE`. The system does not infer an employer-specific rate from a generic public tariff. If the actual rate has not yet been issued or confirmed by the Compensation Fund, labour remains unresolved and the six-bucket snapshot cannot become `READY`.

## Other implemented safeguards

The private Website ingestion endpoint retains bearer-secret authentication, v1/v2 contract validation, immutable replay/conflict classification, HestivaOS-owned canonical pricing, approved cleaner-hour cost formulas, the 20%/R100 contribution floor, upward-to-next-R10 customer-price rounding, and serializable atomic NEW persistence when every authoritative cost component is available.

Missing commercial scope, cost inputs, route facts, or COIDA facts remain explicit review/gating conditions rather than being silently treated as zero or guessed.
