# Recurring service lifecycle review v1

## Status

Current-state audit and implementation note for canonical backlog Phase 1 recurring-service lifecycle work.

## Verified existing behavior

Current `RecurringServiceAgreementsService` already enforces the core non-destructive lifecycle rules from ADR-0026:

- pausing or cancelling a recurring agreement does not mutate or delete previously generated Work Orders;
- a cancelled agreement cannot be resumed;
- manual resume recalculates the next occurrence from the current Africa/Johannesburg business date, so paused historical occurrences do not become a backlog;
- only ACTIVE non-CUSTOM agreements may auto-generate through the existing explicit generation path;
- an existing future Work Order prevents creation of another upcoming visit for the same agreement.

## Verified residual implemented in PR #150

The prior Admin read model exposed only the aggregate Work Order count. It did not show already-created future visits when an operator paused, resumed or cancelled an agreement.

Recurring-service reads now include generated Work Orders whose recurrence date is on or after the current Johannesburg business date. The Admin recurring-services manager displays each future visit with its canonical Work Order link, recurrence date and current status.

Pause and cancel actions explicitly tell the operator that those already-created visits remain unchanged and must be reviewed separately. This is visibility and workflow guidance only; lifecycle changes still do not silently alter Work Orders.

## Remaining verified residual

Persisted automatic resume-date scheduling is not implemented by PR #150. The current schema has no authoritative resume date and there is no safe due-resume execution boundary.

That residual must be implemented as a separate reviewed change that defines:

- a persisted automatic-resume date/time authority;
- validation and clearing rules when an agreement is resumed, cancelled or ended;
- the execution mechanism that activates due agreements safely and idempotently;
- Johannesburg calendar semantics;
- interaction with already-created future Work Orders;
- operational visibility and failure/retry behavior.

No read-triggered, in-memory or implicit auto-resume shortcut should be treated as equivalent to that durable workflow.

## Scope boundaries

PR #150 does not change recurrence calculation, Work Order generation, cancellation semantics, pricing, Finance, Customer correspondence, Website contracts, Messaging, or existing Work Order lifecycle state.

## Authority

- ADR-0026 remains the recurring agreement architecture authority.
- `docs/CANONICAL_BACKLOG_FREEZE_2026-08-19.md` remains the dependency-ordered backlog checkpoint.
- Issue #73 remains the historical cross-system coordination record for the recurring lifecycle product rules that originated in Slice 5M.
