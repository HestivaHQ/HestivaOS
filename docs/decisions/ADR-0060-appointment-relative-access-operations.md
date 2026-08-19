# ADR-0060: Derive access escalation from appointment time and safe usability

- **Status:** Accepted
- **Date:** 2026-08-19
- **Related coordination:** HestivaOS Issue #132; Issue #73 Decisions 48–70

## Context

ADR-0058 introduced canonical Work Order access readiness and one stable Needs Attention condition. ADR-0059 protected visit-scoped credentials and their usability lifecycle. Operations still needs urgency that increases as the scheduled visit approaches, while Technicians need a need-to-know readiness signal without credential access.

## Decision

Extend the existing condition rather than create another alert. Derive its priority on every reconciliation solely from authoritative `WorkOrder.scheduledAt` and current time: more than 24 hours is `NORMAL`; 24 hours through exactly 4 hours is `HIGH`; less than 4 hours and at/after the appointment is `CRITICAL`. There is no separate early-morning rule and no timer/countdown persistence.

The existing condition key remains stable. Resolution, reopening, occurrence count, ownership, Seen state, and database uniqueness retain ADR-0053 semantics. Effective priority changes append a non-secret `PRIORITY_CHANGED` attention activity. Reconciliation treats `NOT_REQUIRED` and `ARRANGED_ANOTHER_WAY` as resolved without credentials. `RECEIVED` is resolved only when Phase 3B metadata proves at least one accepted, unrevoked credential inside its validity interval.

Assigned Technician projections may expose canonical readiness plus one derived operational-resolution boolean. They must strip credential metadata and contents. Credential CRUD/list/reveal authority remains ADMIN-only; readiness management remains ADMIN/SUPERVISOR; the management attention surface retains its existing protected roles.

## Consequences

Access escalation is deterministic, restart-safe, auditable, self-resolving, and duplicate-resistant. Expired, revoked, rejected, pending, or not-yet-valid credentials cannot make access appear usable. The policy provides guidance only: it performs no Work Order lifecycle, staffing, execution, customer-correspondence, messaging, or Finance action.

Phase 3D WhatsApp/Messenger recovery remains deferred.
