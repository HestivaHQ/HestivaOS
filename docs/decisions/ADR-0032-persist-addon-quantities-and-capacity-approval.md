# ADR-0032: Persist add-on quantities and require capacity approval for labour-bound add-ons

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

The original Work Order and Recurring Service Agreement add-on join tables stored only `serviceId`. That representation is lossy for Laundry, Ironing and any other quantity-bearing add-on because a quote for multiple units could collapse to a single boolean-like relationship when accepted operationally.

The canonical service specification also requires HestivaOS to limit Laundry and Ironing loads according to expected job duration/labour capacity. No arbitrary universal numeric load cap has been approved, so the system must not invent one.

## Decision

- `WorkOrderAddOn` and `RecurringServiceAgreementAddOn` persist a positive integer `quantity`.
- Existing rows migrate safely to `quantity = 1`.
- New API input may use structured `addOns: [{ serviceId, quantity, capacityApproved }]`.
- Legacy `addOnIds` remains temporarily accepted for non-capacity-sensitive add-ons with implicit quantity `1`, but is deprecated because it cannot represent quantity or capacity approval.
- Duplicate service IDs and non-positive/non-integer quantities fail closed.
- Recurring-service generation copies the persisted quantity into each generated Work Order.
- Laundry and Ironing require explicit `capacityApproved: true` before a new Work Order or Recurring Service Agreement can accept them. This is an operational approval that the requested loads fit the planned labour/time capacity; it is not a customer-facing pricing decision.
- No hard-coded numeric Laundry/Ironing load ceiling is introduced until Hestiva approves a deterministic capacity model. The safeguard is explicit approval rather than an invented number.

## Consequences

Quote quantities can now be carried into operational records without loss. Work-order and recurring-service UIs expose quantity controls, and Laundry/Ironing additionally expose an explicit labour/time-capacity confirmation.

Historical add-on rows remain valid and read as quantity `1`. The database also enforces positive quantities with CHECK constraints.

## Review triggers

Review this ADR when Hestiva adopts a deterministic labour-minute model, machine-cycle scheduling model, per-service quantity limits, or removes the legacy `addOnIds` compatibility path.
