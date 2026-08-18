# Work Log — Work Order Interrupted Visit v1

Date: 2026-08-18
Phase: 2C — Interrupted / Unable to Complete.

## Implemented

- Added first-class `INTERRUPTED` Work Order state and `INTERRUPTED_VISIT_REVIEW_REQUIRED` Needs Attention type.
- Added additive interruption and management-routing persistence with stable operation UUIDs, request hashes, restrictive foreign keys and append-only history.
- Added Job Leader-only Technician interruption authority from `TRAVELLING`, `ON_SITE`, or `WAITING_FOR_PARTS`, guarded by cached Work Order version and applicable Execution Scope revision.
- Added controlled interruption reasons and factual note validation.
- Added local-first Technician interruption persistence/reconciliation and local read-only boundary after an interruption is recorded.
- Added Needs Attention projection with Critical priority for safety concerns and High priority for other interruptions.
- Added Admin/Supervisor review UI and controlled routing to replacement visit, follow-up, partial-completion review, financial review, or close.
- Kept replacement-visit creation outside this slice. The original attempted visit is not rescheduled or rewritten.
- Kept Finance outside this slice. Financial review is routing metadata only and creates no transaction, charge, credit, refund, obligation or clearance state.
- Kept Customer Correspondence outside this slice. No message is sent.
- Tightened audit semantics so routing without a lifecycle transition does not masquerade as `STATUS_CHANGED`; closing records the actual `INTERRUPTED` → `CLOSED` transition and Needs Attention auto-resolution activity.
- Added focused API contract and web regression coverage for authority, lifecycle boundaries, controlled values, offline durability and domain exclusions.
- Added ADR-0056 plus dedicated deployment and recovery guidance.

## CI evidence during implementation

The first exact-head run after the audit correction passed documentation validation, secret scanning and PostgreSQL clean/staged migration replay, then failed web typecheck because `work-order-interruption-api.ts` imported a non-existent `./api-base` module. The fix uses the repository's existing API URL normalization convention directly. A new exact-head quality-gate run is required before merge; Phase 2C is not complete until that run is fully green.
