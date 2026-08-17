# ADR-0045: Freeze versioned Execution Scope and record compressed field outcomes

- Status: Accepted
- Date: 2026-08-17

## Context

Commercial Quotes do not provide a safe, concise field instruction record. Cleaning standards evolve, while a visit must retain the exact standard and approved job-specific facts used at commencement. Field work must also remain usable offline without turning detailed requirements into dozens of acknowledgements.

## Decision

HestivaOS stores reusable Service Scope Templates with append-only numbered versions and `DRAFT`, `PUBLISHED`, and `RETIRED` lifecycle states. Only Published versions can instantiate a normal Work Order Execution Scope Revision. A revision stores additions, exclusions, stable instantiated sections, job-specific titles/quantity grouping and frozen requirements/evidence policy. Published template rows used historically are restricted from cascade deletion. Improvements use a new version.

An ADMIN-authorized pre-start operation creates a new numbered revision rather than updating an old revision. Start Job requires the cached revision identity to equal the latest authoritative revision and atomically binds `WorkOrder.startedScopeRevisionId`; stale offline starts fail closed with a worker-readable refresh instruction. Existing Work Orders are not backfilled because their historical scope cannot be truthfully reconstructed.

The field checklist is one outcome per section: `PENDING`, `COMPLETED`, or `NOT_COMPLETED`. Detailed requirements are reference-only. Outcome events are append-only, idempotent by operation UUID, attributed to a Technician and field timestamp, and guarded by a section version. The section also holds the current effective event/state for bounded reads. Any assigned Technician can record a Pending section or correct their own outcome; only `WorkOrder.jobLeaderId` can correct another Technician's outcome. Application ADMIN role does not widen field authority.

Not Completed requires a controlled reason and short note. Policy derives attention: safety concern creates a safety-critical stop foundation; other exceptions require Job Leader attention. `NONE`, `ON_EXCEPTION`, and `REQUIRED` evidence policies live in data. Evidence rows distinguish local capture, queue/upload/retry, and server acknowledgement. The exception-first Job Leader review identifies Pending work, malformed exceptions, never-captured required evidence, safety stops, and scope mismatches while treating locally captured/upload-pending evidence separately.

IndexedDB version 2 reuses B1's bounded Job Package and idempotent outgoing-operation store for frozen sections and outcome operations. Reconciliation remains opportunity-driven and retains conflicts rather than applying last-arrival-wins.

## Consequences

The normal UI stays section-first and offers a fast Completed action. One-person crews need no artificial approval because the same assigned Technician can be Job Leader. Template administration and scope-revision APIs are present; a broader Admin editor is deferred.

Full photo capture, compression, transport, server acknowledgement, incident resolution, scope-change/mismatch resolution, additional-work handling, and Complete Job remain separate slices. Until photo capture is implemented, the UI truthfully blocks outcomes whose policy requires evidence rather than pretending upload support exists.
