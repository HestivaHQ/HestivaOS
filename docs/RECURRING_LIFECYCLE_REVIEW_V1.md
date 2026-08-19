# Recurring service lifecycle review v1

## Status

Current-state contract for canonical Phase 1 recurring-service lifecycle behavior.

## Verified lifecycle behavior

`RecurringServiceAgreementsService` enforces the non-destructive lifecycle rules from ADR-0026:

- pausing or cancelling a recurring agreement does not mutate or delete previously generated Work Orders;
- a cancelled agreement cannot be resumed;
- manual resume recalculates the next occurrence from the current Africa/Johannesburg business date, so paused historical occurrences do not become a backlog;
- only ACTIVE non-CUSTOM agreements may generate through the existing explicit generation path;
- an existing future Work Order prevents creation of another upcoming visit for the same agreement;
- recurring-service reads surface already-created future visits for explicit review.

## Future-visit review

Recurring-service reads include generated Work Orders whose recurrence date is on or after the current Johannesburg business date. The Admin recurring-services manager displays each future visit with its canonical Work Order link, recurrence date and current status.

Pause and cancel actions explicitly tell the operator that those already-created visits remain unchanged and must be reviewed separately. Agreement lifecycle changes never silently alter generated Work Orders.

## Automatic resume

A PAUSED agreement may persist an optional `autoResumeDate` as a PostgreSQL `DATE`. The value is a Johannesburg business date, not an instant. It must be later than the current Johannesburg date and may not be later than the agreement end date. A blank value means the pause is indefinite.

Manual ACTIVE, CANCELLED and ENDED transitions clear `autoResumeDate`. Manual resume continues to calculate `nextServiceDate` from the current Johannesburg business date rather than creating missed-occurrence backlog.

The persistent Railway API process owns due-date reconciliation. `RecurringServiceAutoResumeRunner` runs once during application bootstrap and then every minute. It asks the service for PAUSED agreements whose `autoResumeDate` is due on or before the current Johannesburg business date. No GET/read endpoint causes lifecycle mutation.

Each due transition uses a conditional database update that still requires the agreement to be PAUSED and due. This is the idempotency/concurrency boundary: if more than one API process or runner observes the same row, only one update succeeds. For standard cadence agreements, the winning transition recalculates the next occurrence from the current business date; if the end date has already passed **or no valid standard occurrence remains within the inclusive end date**, the agreement becomes ENDED and `nextServiceDate` is cleared. Otherwise it becomes ACTIVE with that next occurrence. CUSTOM agreements remain manually scheduled: a due CUSTOM agreement becomes ACTIVE with `nextServiceDate` null unless its end date has already passed. Every successful transition clears `autoResumeDate`.

The runner processes at most 100 due agreements per pass. Remaining due agreements are eligible on the next minute. A failed pass is logged and retried on the next execution opportunity; process restart also runs reconciliation immediately. No additional scheduler service, provider credential or environment variable is required.

Automatic resume changes only the agreement lifecycle. It does not generate a Work Order, alter an already-created Work Order, assign staff, send correspondence, change pricing or trigger Finance/Messaging behavior.

## Persistence

Migration `20260819223000_recurring_auto_resume` adds nullable `recurring_service_agreements.auto_resume_date` and an index over `(status, auto_resume_date)`. Existing agreements receive null and retain their prior lifecycle state.

## Operational visibility

The Admin recurring-services manager provides an optional automatic-resume date alongside Pause. Paused agreements with a date show that stored date. Existing future-visit links and pause/cancel review warnings remain visible independently of the automatic-resume setting.

## Scope boundaries

This lifecycle implementation does not change recurrence formulas, Work Order generation semantics, generated-visit independence, pricing, Finance, Customer correspondence, Website contracts, Messaging, staffing, or Work Order lifecycle state.

## Authority

- ADR-0026 remains the recurring agreement architecture authority.
- `docs/CANONICAL_BACKLOG_FREEZE_2026-08-19.md` remains the dependency-ordered backlog checkpoint.
- Issue #73 remains the historical cross-system coordination record for the recurring lifecycle product rules that originated in Slice 5M.
