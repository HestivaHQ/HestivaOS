# ADR-0030: Enforce Laundry as an add-on-only runtime capability

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

The canonical service/pricing model in ADR-0029 supersedes the earlier dual-context Laundry Folding assumption. New bookings must treat Laundry and Ironing as add-on-only capabilities attached to qualifying whole-home cleaning, with facilities determining the laundry outcome and approved per-load prices.

The current accepted-quote architecture still has two implementation gaps relevant to this rule: the Website Quote contract predates the structured laundry-facilities fields, and accepted Work Order / Recurring Agreement add-on joins do not yet persist quantity. These gaps must fail closed rather than being hidden by lossy mapping.

## Decision

For new runtime behaviour:

- Laundry is eligible only with `Regular Home Cleaning` and `Deep Cleaning`.
- `Move-In Cleaning`, `Move-Out Cleaning`, `Post-Renovation Cleaning`, room-only services and other primary services do not accept Laundry or Ironing unless a future ADR changes the eligible set.
- Washing machine + tumble dryer resolves to `WASH_DRY_FOLD` at **R175 per standard load**.
- Washing machine + washing line/drying rack resolves to `WASH_HANG` at **R125 per standard load**.
- No working washing machine makes Laundry unavailable; Hestiva does not transport laundry off-site in v1.
- Ironing remains separate at **R150 per standard load** and may be requested for already-clean/dry clothing.
- Requested load quantities must be positive integers.
- Final accepted load quantities must be bounded by the job's available duration/labour capacity before operational approval.
- The legacy `Laundry Folding` Service remains historically readable but is made inactive for new selection; a new canonical `Laundry` `ADD_ON` Service is introduced for new bookings.

The API-side laundry policy module is authoritative for eligibility and approved per-load amounts. Website presentation must agree with it, while authoritative quote calculation remains HestivaOS-owned.

## Persistence boundary

This ADR does **not** pretend accepted add-on quantity persistence already exists. The Work Order and Recurring Agreement add-on join models must gain non-lossy quantity persistence before accepted Laundry/Ironing quantities can be imported. Until then, any handoff that would discard quantity must fail closed or remain pending Admin review.

## Consequences

Historical Laundry Folding IDs and relationships are preserved. New catalogue selection uses Laundry as `ADD_ON` only. The old `BOTH` semantics remain historical context rather than new-booking authority.

The Website → HestivaOS contract must be extended in a coordinated follow-up so laundry facilities, outcome and requested quantities are transmitted explicitly instead of being reconstructed from free text.

## Review triggers

Review this ADR if Laundry becomes standalone, off-site laundry is introduced, eligible primary services change, the pricing changes, machine/facility assumptions change, or accepted add-on quantity persistence is redesigned.
