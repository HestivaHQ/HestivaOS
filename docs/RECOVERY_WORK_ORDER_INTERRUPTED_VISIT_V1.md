# Recovery — Work Order Interrupted Visit v1

Date: 2026-08-18
Scope: Phase 2C.

## Recovery invariants

- Preserve the original attempted Work Order and its `INTERRUPTED` history.
- Preserve `work_order_interruptions` and `work_order_interruption_routes`; they are audit records, not disposable workflow cache.
- Never convert an interruption to `COMPLETED` without the authoritative Technician completion contract.
- Never convert an interruption to `CANCELLED` merely to remove it from active views.
- Never move the attempted visit date to represent a replacement visit.
- Finance and Customer Correspondence must not be reconstructed from Phase 2C routing records as if those records were financial or messaging authority.

## Offline reconciliation recovery

The Technician client persists one interruption operation locally before network reconciliation. Retrying must reuse the same operation UUID and the same factual payload. The API request hash rejects reuse of an operation UUID for a different request.

If reconciliation reports a conflict because the cached Work Order version, status, Job Leader, or applicable Execution Scope changed, do not manufacture a new interruption automatically. Refresh authoritative state and require human review of the conflicting visit history.

## Server recovery

If an interruption was accepted but the client did not receive the response, replaying the identical operation recovers the accepted audit record idempotently.

If a management routing response is lost, replay the identical routing operation UUID and payload. Do not create a second route merely because the response was lost.

If the Needs Attention projection is inconsistent with an authoritative `INTERRUPTED` Work Order, repair the projection from the interruption record and activity history; do not rewrite the interruption to fit the projection.

## Rollback / incident response

Prefer rolling back application code while retaining additive schema and audit rows. If an older release cannot understand `INTERRUPTED`, restore a compatible release rather than mutating historical Work Order status. Any destructive removal of interruption history requires an explicit retention decision and is outside normal recovery.
