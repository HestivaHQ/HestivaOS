# ADR-0053: Dashboard Needs Attention foundation

- **Status:** Accepted
- **Date:** 2026-08-18
- **Related coordination:** HestivaOS Issue #125; Issue #73 Decisions 58–67

## Context

Issue #73 established the existing Dashboard as the HestivaOS Today/Operations command centre and approved a shared Needs Attention pattern for actionable operational exceptions. The current Dashboard has direct counters for today's unassigned jobs and overdue Work Orders, but those counters have no durable occurrence lifecycle, ownership, Seen state, reassignment audit, or generic foundation for future authoritative exception producers.

The launch foundation must improve operational control without pre-building Finance, Correspondence, Access, Worker Issue, Job Exception, notification, snooze, delegation, or AI-priority systems that do not yet have authoritative runtime state.

## Decision

HestivaOS adopts one persisted `AttentionItem` domain with append-only `AttentionItemActivity` history.

1. An attention item represents a stable unresolved condition, identified by a deterministic unique `conditionKey`. Repeated reads do not create duplicate items for the same condition.

2. The first supported subject is a Work Order. `subjectType` plus `subjectId` are deliberately generic scalar identity fields rather than a Work Order-only foreign-key shape so later authoritative domains can join the same command-centre queue without creating parallel attention systems. Phase 1 does not pretend those later producers already exist.

3. The first producers are limited to current facts HestivaOS can prove:
   - a Work Order scheduled today with no normalized Technician assignment and no Crew;
   - a Work Order scheduled before the current Johannesburg business day and still operationally unresolved;
   - a Technician-completed Work Order awaiting the existing ADMIN/SUPERVISOR completion acknowledgement.

4. Phase 1 priority is deterministic and intentionally simple:
   - overdue Work Order → `CRITICAL`;
   - today-unassigned Work Order → `HIGH`;
   - completion acknowledgement → `NORMAL`.
   Within a priority, items with a due time sort first by earliest due time, then by occurrence age. No AI judgment or opaque score is used.

5. Queue ownership is permission-aware:
   - `OPERATIONS` may be owned by ADMIN, OPERATIONS_MANAGER, DISPATCHER or SUPERVISOR;
   - `MANAGEMENT_REVIEW` may be owned by ADMIN or SUPERVISOR.
   An inactive or newly ineligible owner is automatically removed during reconciliation and the item returns to its eligible queue with audit history rather than becoming orphaned.

6. `Mine` includes items assigned to the current user plus unassigned items in queues that user is eligible to work. For ADMIN, unresolved `CRITICAL` items remain visible in `Mine` even if assigned elsewhere. `All` shows all unresolved items in queues visible to the current role.

7. `Seen` is distinct from resolution. Phase 1 stores the first authoritative Seen actor/time on the current occurrence. Marking Seen does not resolve the item or suppress deterministic priority. Reopened occurrences clear Seen and owner state so stale handling state is not carried forward.

8. Resolution is condition-driven in Phase 1. When reconciliation proves the underlying condition no longer exists, the occurrence becomes `RESOLVED` automatically and records `AUTO_RESOLVED`. History is retained; if the same stable condition later returns, the same item reopens, increments its occurrence count and records `REOPENED`.

9. Manual attention-item resolution is not introduced in this foundation. Operators resolve the authoritative underlying Work Order condition through the existing deep-linked workflow.

10. The Dashboard hierarchy becomes **Needs Attention → Today's Work → Shortcuts → Upcoming**. Healthy state remains quiet; the queue contains actionable exceptions only.

## Consequences

- Dashboard exceptions now have durable identity, ownership, Seen state and lifecycle history instead of only transient counters.
- Same-condition duplicate spam is prevented by database uniqueness on `conditionKey` while distinct actions remain separate items.
- Correcting assignment, status, schedule or completion acknowledgement automatically clears the corresponding live exception without deleting its history.
- Future authoritative domains can contribute to one queue, but they must add explicit producer logic and policy rather than inventing speculative attention records.
- The first implementation adds Prisma enums/models and an additive migration, plus protected `/api/v1/attention` read/Seen/assignment routes.

## Deferred

This ADR deliberately does not implement or decide:

- snooze or time-bounded delegation from Issue #73 Decisions 68–70;
- push/active notification delivery or escalation transport;
- Finance, Correspondence, Access, Messaging-human-review or other future producers before their authoritative runtime state exists;
- manual resolution of deterministic source conditions;
- automated shift handover;
- AI/ML prioritization.
