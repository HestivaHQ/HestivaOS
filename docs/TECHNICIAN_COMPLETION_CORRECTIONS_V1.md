# Technician Completion Corrections v1

Status: implemented on 2026-08-19.

ADMIN or SUPERVISOR may explicitly authorize correction of named frozen-scope sections on an authoritatively completed Work Order. Authorization records a stable operation UUID, reason, actor/time, submitting Technician, affected section identities, and a snapshot of the original completion and any current acknowledgement. A Technician cannot authorize correction and may change only selected sections whose current submitted outcome belongs to that same currently assigned Technician.

The Work Order remains `COMPLETED`; frozen Execution Scope is never revised. Each corrected outcome is a new `ExecutionSectionOutcomeEvent` linked to the authorization, so the prior event remains history. Existing evidence is validated and retained rather than relinked; new evidence is additive. Incident, interruption, scope-mismatch and evidence records are not updated or deleted.

The first accepted corrected outcome makes an existing acknowledgement and correspondence eligibility non-current by clearing only the Work Order's current pointers. The authorization retains the original acknowledgement actor/time and eligibility snapshot. After the Technician durably queues and idempotently resubmits the corrected completion, ADMIN/SUPERVISOR must use the existing completion acknowledgement action again. Every authorization and resubmission uses stable UUID identity; conflicting reuse is rejected and device operations needing review are retained.

This workflow changes no price, Finance, customer correspondence delivery, staffing, frozen scope, incident review, interruption routing, scope-mismatch resolution, or unrelated lifecycle state.
