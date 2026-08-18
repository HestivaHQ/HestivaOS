# ADR-0058: Separate Work Order access readiness from lifecycle and credentials

- **Status:** Accepted
- **Date:** 2026-08-18
- **Related coordination:** HestivaOS Issue #132; Issue #73 Decisions 48–57 and 58–67

## Context

A visit can require access action without being cancelled or otherwise changing its lifecycle. Property access facts outlive a visit, while temporary credentials have stricter visit-scoped security needs. Needs Attention requires an authoritative condition rather than inference from prose.

## Decision

Persist one controlled readiness state on each Work Order, separate from `WorkOrderStatus`, stable Property facts, and temporary credential records. Preserve effective transitions in an append-only actor-attributed event stream. ADMIN and SUPERVISOR manage readiness through a protected constrained API/UI. The existing Needs Attention reconciler owns one deterministic High-priority Operations condition while readiness is missing, under review, or expired, and self-resolves it when readiness becomes operationally resolved.

Readiness contains no credential value or attachment. Phase 3A never selects or exposes temporary credential records and never changes Work Order lifecycle, schedule, assignment, or execution behavior.

## Consequences

Operations gains explicit auditable visit readiness and one non-duplicating exception. Existing records begin `NOT_REQUIRED` and require deliberate classification when access is required. Protected credential review, time-relative escalation, messaging recovery, automatic correspondence, and Finance remain deferred.
