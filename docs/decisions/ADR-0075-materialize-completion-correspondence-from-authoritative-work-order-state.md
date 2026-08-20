# ADR-0075: Materialize completion correspondence from authoritative Work Order state

## Status

Accepted

## Context

ADR-0072 made rendered Correspondence immutable and ADR-0074 requires a human-initiated delivery attempt before any customer-facing send. Work Orders already expose a narrower authoritative completion boundary: Technician completion becomes eligible for customer correspondence only after management acknowledgement, recorded by `completionAcknowledgedAt` and `completionCorrespondenceEligibleAt`.

The first event-driven Correspondence integration must consume that authoritative state without making Correspondence a second Work Order lifecycle authority, inventing placeholder semantics, choosing a transport provider, or allowing event handling to bypass the human delivery gate.

There is also no approved global event-to-template binding yet. A completion integration therefore must not silently choose customer wording merely because a Work Order became eligible.

## Decision

The first Work Order event integration is completion acknowledgement only.

An ADMIN may materialize a completion Correspondence record from an exact Work Order after the Work Order has crossed its authoritative completion-acknowledgement boundary. The integration:

- accepts an explicitly selected published Correspondence template version;
- reads the current authoritative Work Order completion fields and canonical Customer contact fields server-side;
- snapshots those recipient fields and the exact completion source facts into immutable Correspondence provenance;
- uses the stable source-event key `work_order.completion_acknowledged.v1:<workOrderId>`;
- serializes materialization per source-event key with a PostgreSQL transaction advisory lock;
- returns the already-created immutable record when the same source event is requested again, rather than creating duplicate completion records;
- permits materialization while the Work Order is `COMPLETED` or later `CLOSED`, provided the acknowledgement/eligibility facts remain present;
- does not create a delivery attempt, call a provider, schedule a retry, or send anything.

The selected template must already be `PUBLISHED`. Because placeholder semantics remain unapproved, the existing v1 renderer continues to snapshot its subject/body verbatim.

The existing generic ADMIN materialization API remains available for non-event-specific/manual Correspondence. Event-specific provenance is namespaced under `eventIntegration` so the source-event identity is distinguishable from caller-supplied generic provenance.

## Consequences

Completion correspondence now has a deterministic, idempotent bridge from authoritative Work Order state into immutable Correspondence history without adding another mutable event table.

The Work Order remains the authority for whether completion is eligible. Correspondence remains the authority for the exact rendered record and later delivery-attempt chain.

The ADMIN who materializes the record is not thereby approving delivery. ADR-0074 still requires a separate ADMIN-created delivery attempt for the exact record.

Booking, reschedule and cancellation integrations remain separate slices because their authoritative runtime transition points and event identity must be verified individually before integration. A later approved event-to-template binding may automate materialization, but this ADR does not authorize one.

## Rejected alternatives

- **Create a delivery attempt automatically when completion is acknowledged.** Rejected because it bypasses ADR-0074.
- **Choose a hard-coded completion template automatically.** Rejected because no event-to-template binding or customer wording has been approved.
- **Create a second mutable Correspondence event-status table.** Rejected for this slice because the Work Order already persists the authoritative eligibility facts and immutable Correspondence provenance can record the consumed source event.
- **Allow materialization before management acknowledgement.** Rejected because Technician completion may still require correction/review and the Work Order domain already defines the safe correspondence eligibility boundary.
