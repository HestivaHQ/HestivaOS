# Work Order Material Change v1 recovery

## Stale preview or conflict

A controlled material-change commit must use the `expectedUpdatedAt` returned by the reviewed preview. If the Work Order changed after preview, reload the authoritative Work Order, rerun preview, review the new consequences, and commit only the newly reviewed state. Do not bypass the conflict with direct SQL or the generic edit/status endpoints.

## Uncertain commit result

The client-generated `operationId` is the recovery identity. After a timeout or uncertain response, retry the **same operationId with the same requested content**. A committed operation returns the existing material-change record and does not repeat the mutation. Never mint a new operation ID merely because the response was lost.

If the operation ID is reported as already used for different content, stop and review the existing material-change history. Do not overwrite or delete the earlier audit record.

## In-progress or historical block

`ON_SITE` and `WAITING_FOR_PARTS` preserve the booked/frozen execution scope. Do not repair a blocked material change by editing the Work Order directly; use the Phase 2B in-service scope-difference workflow once implemented. `COMPLETED`, `CLOSED`, and `CANCELLED` are historical operational truth and must not be rewritten.

## Audit verification

For a disputed material change, inspect the append-only `work_order_material_changes` record for operation ID, actor, stage, previous snapshot, requested changes, consequence snapshot, reason/override reason and commit timestamp. For cancellation, also verify the existing Work Order status/cancellation activity entries. Preserve both histories together.

## Finance and correspondence boundaries

Phase 2A records consequence boundaries only. It does not prove that a charge/refund/credit was decided and does not prove that a customer message was sent. Do not infer financial or correspondence completion from a material-change audit row. Those outcomes belong to their future authoritative domains.

## Migration recovery

Migration `20260818223000_work_order_material_changes` is additive. If application rollout fails, roll back application code first and retain the audit table. Use normal Prisma migration status/replay diagnostics; do not delete `_prisma_migrations`, drop the table, or remove operational history as a recovery shortcut.
