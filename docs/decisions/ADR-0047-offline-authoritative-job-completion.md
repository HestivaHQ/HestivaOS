# ADR-0047: Reconcile local-first job completion before management acknowledgement

- **Status:** Accepted
- **Date:** 2026-08-18

## Context

Homent Technician already records Start Job, frozen-scope outcomes, and durable evidence through idempotent offline operations. Completion must let a crew leave without connectivity while preventing an unassigned Technician, stale scope, incomplete checklist, or unreviewed result from producing an authoritative completion or customer message.

## Decision

Only the active assigned Job Leader may create a stable UUID `COMPLETE_JOB` operation for the started frozen Execution Scope. IndexedDB version 4 preserves the existing `jobs`, `operations`, and `evidence` stores and retains completion operations through acknowledgement or conflict. Durable local completion makes normal execution read-only and is displayed as sync pending; it does not change the server status.

`POST /technician/jobs/:id/complete` rechecks identity, assignment, leadership, started status, frozen scope, section outcomes, exception details, and evidence metadata. Captured evidence metadata is sufficient even while its object upload is pending. A successful serializable transaction records the operation UUID and Technician/time audit fields, creates one activity, and moves the Work Order to `COMPLETED`. The same operation returns its result; a different operation conflicts.

Completion creates no customer correspondence. ADMIN or SUPERVISOR must use the separate management acknowledgement endpoint after inspecting the completion. Acknowledgement stores actor/time idempotently and sets correspondence eligibility; this slice has no sender and makes no WhatsApp, Messenger, SMS, or email request.

## Consequences

There is no server-side offline status and no Technician reopen path. Reconciliation conflicts retain the device operation as `NEEDS_REVIEW`. Existing captured evidence continues to sync. Customer delivery remains deferred to an approved communication layer coordinated through Issue #116.

## Review triggers

Review this decision before adding correction/reopen workflows, changing required-evidence semantics, consuming correspondence eligibility, or introducing a fuller Supervisor experience.
