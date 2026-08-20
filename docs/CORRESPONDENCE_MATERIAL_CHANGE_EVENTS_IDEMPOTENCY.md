# Idempotency

Correspondence reschedule and cancellation materialization use the immutable controlled material-change `operation_id` as event identity. The service takes a transaction-scoped PostgreSQL advisory lock for the derived source-event key and returns an existing Correspondence record before materializing another one.
