# ADR-0077: Materialize reschedule and cancellation correspondence from controlled Work Order changes

## Status

Accepted

## Context

Phase 2 requires authoritative reschedule and cancellation transitions before Correspondence can integrate those customer communication events safely. ADR-0054 already makes the controlled Work Order material-change workflow authoritative for confirmed booking changes. Each successful commit persists an immutable `work_order_material_changes` row with a unique `operation_id`, the Work Order and actor identities, lifecycle stage, previous snapshot, normalized requested changes, consequences and commit timestamp.

A `scheduledAt` request in that committed audit row is therefore durable evidence of a reschedule. A committed requested status of `CANCELLED` is durable evidence of cancellation. Reading only the Work Order's current state would lose event identity after later changes and could not support deterministic replay.

ADR-0074 still requires a separate human-created delivery attempt before any customer-facing send. There is still no approved global event-to-template binding or placeholder vocabulary.

## Decision

Correspondence materializes reschedule and cancellation records from the immutable controlled material-change operation, not by inferring an event from current Work Order state.

An ADMIN may materialize:

- a reschedule record only when the exact `operation_id` belongs to the supplied Work Order and its persisted `requested_changes` contains `scheduledAt` without being a cancellation;
- a cancellation record only when the exact operation belongs to the supplied Work Order and its persisted requested status is `CANCELLED`.

The integration:

- accepts an explicitly selected published Correspondence template version;
- reads canonical Customer recipient fields server-side;
- snapshots the immutable material-change operation identity, actor, stage, commit time, reason/override reason, previous snapshot, requested changes and consequences into Correspondence provenance;
- uses stable source-event keys `work_order.material_change.rescheduled.v1:<operationId>` and `work_order.material_change.cancelled.v1:<operationId>`;
- serializes materialization per source-event key with a PostgreSQL transaction advisory lock;
- returns the existing immutable record when the same source event is materialized again;
- treats cancellation as the event when one operation both changes scheduling fields and requests `CANCELLED`;
- does not create a delivery attempt, call a provider, retry or send anything.

The selected template must already be `PUBLISHED`. Subject/body remain verbatim because placeholder semantics are still unapproved.

## Consequences

The Work Order material-change domain remains authoritative for whether a reschedule or cancellation occurred. Correspondence records immutable communication output and provenance without becoming a second operational authority.

Later Work Order edits do not change the source event because event identity and facts come from the immutable material-change operation. No new Correspondence-specific event table or Work Order flag is required.

The ADMIN who materializes the record has not approved delivery. ADR-0074 still requires a separate ADMIN-created delivery attempt for that exact immutable Correspondence record.

## Rejected alternatives

- **Infer reschedule by comparing the current Work Order schedule with Quote state.** Rejected because later changes destroy deterministic event identity.
- **Use current `CANCELLED` status alone as the cancellation event.** Rejected because it does not identify which controlled operation performed the transition.
- **Create correspondence inside the material-change transaction.** Rejected because no event-to-template binding is approved and explicit ADMIN materialization remains the current boundary.
- **Create a delivery attempt automatically after a reschedule or cancellation.** Rejected because it bypasses ADR-0074.
