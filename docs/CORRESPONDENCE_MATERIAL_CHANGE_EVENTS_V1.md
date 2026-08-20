# Correspondence material-change event integration v1

## Status

Implemented by ADR-0077.

## Authoritative source

Confirmed Work Order reschedules and cancellations use the controlled material-change workflow from ADR-0054. The immutable `work_order_material_changes.operation_id` is the source-event identity. Reschedule requires persisted `scheduledAt` in `requested_changes`; cancellation requires persisted requested status `CANCELLED` and takes precedence if both appear in one operation.

## Correspondence boundary

ADMIN-only materialization endpoints require the Work Order ID, exact material-change operation ID and an explicitly selected published template version. They snapshot canonical Customer recipient fields plus the immutable material-change audit facts into Correspondence provenance.

Stable source-event keys are:

- `work_order.material_change.rescheduled.v1:<operationId>`
- `work_order.material_change.cancelled.v1:<operationId>`

A transaction advisory lock plus existing-record lookup makes replay return the same immutable Correspondence record.

## Delivery boundary

Materialization does not create a delivery attempt, invoke a provider, retry or send customer communication. ADR-0074 remains authoritative: every customer-facing delivery attempt requires separate explicit ADMIN initiation.
