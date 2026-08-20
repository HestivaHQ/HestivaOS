# Correspondence material-change event integration v1

## Status

Implemented by ADR-0077.

## Authoritative source

Confirmed Work Order reschedules and cancellations use the controlled material-change workflow from ADR-0054. The immutable `work_order_material_changes.operation_id` is the source-event identity. Reschedule requires persisted `scheduledAt` in `requested_changes`; cancellation requires persisted requested status `CANCELLED` and takes precedence if both appear in one operation.

No database migration is required: the existing immutable `work_order_material_changes` table already provides the unique operation identity and persisted source facts required by this integration.

## Correspondence boundary

ADMIN-only materialization endpoints require the Work Order ID, exact material-change operation ID and an explicitly selected published template version:

- `POST /api/v1/correspondence/records/events/work-orders/:workOrderId/material-changes/:operationId/reschedule/materialize`
- `POST /api/v1/correspondence/records/events/work-orders/:workOrderId/material-changes/:operationId/cancellation/materialize`

Work Order and operation identifiers are UUID-validated at the HTTP boundary. The service requires the immutable operation to belong to the supplied Work Order, reads canonical Customer recipient fields server-side, and snapshots the material-change operation identity, actor, lifecycle stage, commit timestamp, reason/override reason, previous snapshot, requested changes and consequences into Correspondence provenance.

Stable source-event keys are:

- `work_order.material_change.rescheduled.v1:<operationId>`
- `work_order.material_change.cancelled.v1:<operationId>`

A transaction advisory lock plus existing-record lookup makes replay return the same immutable Correspondence record.

## Validation

Focused validation covers authoritative reschedule recognition, authoritative cancellation recognition, cancellation precedence when one operation also changes scheduling, rejection of event-type mismatch, and idempotent replay. Repository API type-check and the full API Jest suite remain required pull-request gates.

## Delivery boundary

Materialization does not create a delivery attempt, invoke a provider, retry or send customer communication. ADR-0074 remains authoritative: every customer-facing delivery attempt requires separate explicit ADMIN initiation.
