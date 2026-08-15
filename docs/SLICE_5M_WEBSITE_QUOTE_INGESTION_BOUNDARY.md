# Slice 5M — Website Quote ingestion boundary

## Status

Implemented as a guarded runtime boundary with canonical HestivaOS base pricing, the approved six-bucket cost model, universal profitability-floor calculation, atomic NEW Quote persistence, and an OpenRouteService-backed actual-road-distance source.

A valid Website Quote submission is not discarded merely because its commercial or operational facts require human review. When the request passes authentication and contract validation but the operational-cost resolver cannot yet produce every authoritative cost component, HestivaOS persists the Quote atomically as `NEEDS_ATTENTION`, returns the authoritative `Q-...` reference, and records the unresolved cost components/provenance for review. The stored pricing snapshot is explicitly non-final because the profitability floor cannot be completed until those cost facts are resolved.

The runtime still fails closed for genuine boundary failures such as invalid authentication, invalid contract data, idempotency conflicts, database failures, exhausted Quote-reference capacity, or routing/infrastructure failures that prevent the request from reaching a safe persistence decision. Missing or uncertain commercial facts are never guessed or silently treated as zero.

A production website handoff smoke test has succeeded with the configured HestivaOS endpoint and routing prerequisites. The currently configured COIDA input is provisional for internal costing pending the business's authoritative Compensation Fund assessment; replacing that factual input remains an operational costing follow-up rather than a Website Quote or Laundry-contract implementation gap.

## Routing / deployment cost

The approved deployment cost remains **R1.82 per allocated planned road kilometre**.

`OpenRouteServiceAllocatedRouteDistanceResolver` obtains the one-way driving distance from OpenRouteService/HeiGIT using the configured deployment-base coordinates and the service property's coordinates, then allocates the isolated round trip to the quote.

Browser-provided property coordinates are preferred when present and valid. They are not required from the customer: when browser GPS is absent, HestivaOS geocodes the required service address (`addressLine1`, suburb, optional postal code, South Africa) server-side and uses the resolved property coordinates for road routing. This keeps quote submission independent of browser location permission and supports customers requesting a quote while physically away from the service property.

Quote-time allocation is conservative: until an actual multi-booking route plan exists, the booking is costed as an isolated **deployment base → property → deployment base** round trip. Later route clustering may improve realised economics but does not weaken the original quote profitability safeguard.

Required deployment configuration:

- `OPENROUTESERVICE_API_KEY`
- `HESTIVA_DEPLOYMENT_BASE_LATITUDE`
- `HESTIVA_DEPLOYMENT_BASE_LONGITUDE`

The resolver does not substitute geometric/straight-line distance or the customer's current device location for the service property. If route facts cannot be resolved for a valid submission, the unresolved deployment-cost component is retained as review metadata and the Quote remains `NEEDS_ATTENTION`; the system must not represent the stored amount as a final profitability-protected customer price until factual routing is available.

## COIDA

Labour requires a configured valid COIDA rate through `HESTIVA_COIDA_RATE`. The application does not infer an employer-specific rate from a generic public tariff. The production value used for the verified handoff is provisional for internal costing pending the authoritative Compensation Fund assessment and must be replaced when that assessment is known.

If the factual COIDA input is unavailable or invalid for an otherwise valid Website Quote submission, labour cost remains unresolved and the Quote is persisted as `NEEDS_ATTENTION`; the profitability-protected price is not treated as final until the cost input is corrected.

## Other implemented safeguards

The private Website ingestion endpoint retains bearer-secret authentication, v1/v2 contract validation, immutable replay/conflict classification, HestivaOS-owned canonical pricing, approved cleaner-hour cost formulas, the 20%/R100 contribution floor, upward-to-next-R10 customer-price rounding when a complete cost snapshot exists, and serializable atomic NEW persistence.

Review-required examples include open-ended floor/room bands, services whose workload needs more scope detail, or incomplete operational cost components. These conditions create a durable `NEEDS_ATTENTION` Quote rather than losing the customer request. Acceptance/operational progression remains blocked until the required review is completed.
