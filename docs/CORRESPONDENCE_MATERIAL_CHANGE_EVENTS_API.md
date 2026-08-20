# Correspondence material-change event API

ADMIN-only endpoints:

- `POST /api/v1/correspondence/records/events/work-orders/:workOrderId/material-changes/:operationId/reschedule/materialize`
- `POST /api/v1/correspondence/records/events/work-orders/:workOrderId/material-changes/:operationId/cancellation/materialize`

Each body supplies `templateVersionId` for an explicitly selected published Correspondence template version. Neither endpoint creates a delivery attempt or sends anything.
