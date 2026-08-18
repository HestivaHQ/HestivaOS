# Recovery — Work Order Scope Mismatch v1

Date: 2026-08-18
Scope: Phase 2B.

## Duplicate or uncertain submission

Every management resolution carries a stable client-generated operation UUID. If the client is uncertain whether a request succeeded, retry the same operation UUID with the identical payload. The API returns the existing resolution when the request hash matches. Reusing the same operation UUID with a different payload fails closed.

## Missing resolution after UI failure

Reload `GET /work-orders/:id/scope-mismatches` and inspect the resolution history for the authoritative mismatch event. Do not recreate the Technician mismatch report and do not edit the frozen Execution Scope to compensate for a UI failure.

## Incorrect management resolution

Resolution history is append-only. Do not delete or overwrite the earlier decision. Record a new management resolution event with a new operation UUID so the history shows both the earlier decision and the corrective decision.

## Customer approval uncertainty

If approval cannot be proven, do not mark it `APPROVED`. Leave the chargeable resolution pending or record a later corrected resolution when approval evidence is available. `additionalWorkMayBegin` must remain false until capacity is reviewed and approval is explicitly recorded.

## Finance or correspondence failure

Phase 2B does not create Finance state or send correspondence, so there is no payment/message side effect to reverse. Later integrations must consume the append-only management resolution as input and preserve their own recovery/idempotency rules.

## Database recovery

The `work_order_scope_mismatch_resolutions` table is operational audit history. Restore it together with Work Orders, Users and execution outcome events. Foreign-key relationships must remain consistent. Never repair by rewriting the original Technician outcome or started Execution Scope.
