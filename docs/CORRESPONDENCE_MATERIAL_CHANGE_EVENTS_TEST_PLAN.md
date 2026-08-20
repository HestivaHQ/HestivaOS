# Correspondence material-change events validation

Validation for ADR-0077 covers authoritative reschedule recognition, authoritative cancellation recognition, cancellation precedence when one operation also changes scheduling, rejection of event-type mismatch, and idempotent replay of an already materialized source event. Repository API type-check and the full API Jest suite remain required pull-request gates.
