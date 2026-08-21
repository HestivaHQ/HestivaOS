# Pet-Hair Treatment Pricing v1

Status: Approved on 2026-08-21.

## Canonical commercial rule

Pet-Hair Treatment is a cleaning add-on priced at **R150 per visit** (`15000` ZAR minor units) for the current Website Quote payload v1/v2 integration. The current website selection uses quantity `1`; HestivaOS must not infer a multiplier from the number of pets.

The fixed price covers the ordinary additional vacuuming, brushing and accessible-surface work implied by normal pet-hair accumulation within a qualifying cleaning visit. Severe or unusual accumulation remains subject to the existing home-condition, scope-review and profitability safeguards rather than silently increasing the fixed add-on price.

## Quote-review behaviour

A selected Pet-Hair Treatment add-on does not require an extra size/count field merely to receive its canonical R150 price. It may still remain inside an overall `NEEDS_ATTENTION` Quote when another pricing, scope, operational-cost, evidence or mapping reason remains unresolved.

Admin remediation must create a new immutable `ADMIN_REVISION`; it must not overwrite the original customer submission. Acceptance remains fail-closed until the current revision passes all review and preflight checks.

## Related canonical sources

This rule supplements `CANONICAL_SERVICE_SCOPE_PRICING_V1.md` and the Website Quote integration contract. Issue #179 records the approval and implementation coordination for this slice.
