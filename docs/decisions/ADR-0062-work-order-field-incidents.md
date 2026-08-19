# ADR-0062: Preserve field incidents separately from visit outcomes

- Status: Accepted
- Date: 2026-08-19

## Context

Execution outcomes truthfully describe section work, while scope mismatch and interrupted visits already own distinct resolution lifecycles. Serious safety, damage, condition, and operational facts need durable management follow-up even if a job later completes.

## Decision

Create an append-only Work Order Incident aggregate with four controlled field categories, assignment-scoped Technician reporting, stable operation UUID/request hash, contemporaneous Job Leader and optional frozen-section context, and links to the existing Execution Evidence pipeline. Reuse `SAFETY_CRITICAL_STOP` terminology without changing checklist or interruption authority.

ADMIN/SUPERVISOR append controlled acknowledgement, neutral resolution, and reopen records. Unresolved incidents contribute deterministic shared Needs Attention conditions. Incident lifecycle never changes Work Order lifecycle, other exception facts, correspondence, Finance, liability, legal, insurance, or HR state.

## Consequences

Offline replay converges without duplicate incidents or evidence. Completion cannot erase an unresolved incident. Management has one focused Work Order surface and one existing attention queue; no generic ticket or parallel alert system is introduced. Notification delivery, Supervisor-specific product expansion, private evidence-read hardening, customer correspondence, and Finance remain deferred.
