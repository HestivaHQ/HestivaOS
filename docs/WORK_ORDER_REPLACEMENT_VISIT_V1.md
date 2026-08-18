# Work Order Replacement Visit v1

Status: Phase 2D implementation contract.
Date: 2026-08-18
Coordination: Issue #127, Issue #73 replacement-visit requirement.

A replacement visit is a new Work Order linked to an authoritative interrupted attempt. The original interrupted Work Order remains unchanged as the historical record of attendance, frozen Execution Scope, section outcomes, evidence and interruption facts.

ADMIN or SUPERVISOR must first route the interrupted visit to `REPLACEMENT_VISIT`, then explicitly choose the replacement service date/time. Creation uses a stable operation UUID and is idempotent. Each interruption may produce at most one linked replacement Work Order.

The replacement inherits the original customer, property, primary service, add-ons, recurring-agreement association, booked service context and non-secret visit instructions. It starts as `NEW` and unassigned with a fresh Work Order reference. It does not inherit Technician/crew assignment, Job Leader, start/completion/interruption state, execution outcomes, evidence, frozen scope revisions, temporary access credentials or customer correspondence state.

Replacement provenance is stored in `work_order_replacement_visits`. Creating the replacement resolves the interruption Needs Attention condition because an authoritative downstream operational action now exists. The original Work Order remains `INTERRUPTED` and is never silently rescheduled or rewritten.

Finance is outside this slice. Replacement creation does not create or infer charges, credits, payments, refunds or financial clearance. Customer correspondence is also outside this slice and no message is sent automatically.
