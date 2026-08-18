# Recovery — Work Order Replacement Visit v1

If replacement creation fails before commit, retry the same operation UUID and payload. The API is idempotent and will return the existing link if the transaction committed but the response was lost.

Do not repair a failed replacement by changing the original interrupted Work Order's schedule or status. The original attempt is historical truth.

If the provenance row exists but the UI did not refresh, reload the Work Order; `GET /work-orders/:id/interruption/replacement` is the authoritative read path.

If a wrong replacement time was selected after creation, use the normal controlled Work Order material-change workflow on the replacement Work Order. Do not delete/recreate the provenance link.

If a replacement Work Order must be abandoned, use the normal Work Order lifecycle on the replacement. The interrupted source remains unchanged.

No Finance repair is part of this runbook. Replacement creation does not imply or reconcile charges, credits, payments or refunds.
