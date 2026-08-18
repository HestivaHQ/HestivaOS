# Dashboard Needs Attention Foundation v1

Status: Phase 1 implementation contract for HestivaOS Issue #125, derived from Issue #73 Decisions 58–67.

## Purpose

Needs Attention is the exception/readiness layer of the existing HestivaOS Dashboard. It is not a separate Operations product and it is not a general notification feed. Healthy states stay quiet. Live items represent actionable unresolved conditions that HestivaOS can prove from authoritative data.

## Phase 1 producers

Phase 1 creates live attention occurrences only for these Work Order conditions:

| Type | Condition | Priority | Queue | Resolution |
| --- | --- | --- | --- | --- |
| `TODAY_UNASSIGNED_WORK_ORDER` | Scheduled in the current Africa/Johannesburg business day, operationally unresolved, no Crew and no normalized `WorkOrderTechnician` assignment | `HIGH` | `OPERATIONS` | Assign a Crew/Technician or otherwise move the Work Order out of the condition |
| `OVERDUE_WORK_ORDER` | Scheduled before the current Johannesburg business day and still operationally unresolved | `CRITICAL` | `OPERATIONS` | Resolve/correct the authoritative Work Order lifecycle/schedule condition |
| `COMPLETION_ACKNOWLEDGEMENT_REQUIRED` | Technician completion has been accepted, Work Order is `COMPLETED`, and management acknowledgement is still absent | `NORMAL` | `MANAGEMENT_REVIEW` | Use the existing completion acknowledgement action |

The implementation deliberately does not manufacture payment, correspondence, access-credential, Worker Issue, Job Exception, or Messaging-human-review items before those domains provide authoritative runtime conditions.

## Durable lifecycle

Every condition has one database-unique `conditionKey`. Repeated Dashboard/API reads reconcile the same row instead of generating duplicate alerts.

- first observation → `OPENED` activity;
- first Seen action → `SEEN` activity and actor/time; Seen is not resolution;
- owner selection → `ASSIGNED` or `REASSIGNED` activity;
- underlying condition clears → `RESOLVED` plus `AUTO_RESOLVED` activity;
- the same stable condition returns later → the same item reopens, increments `occurrenceCount`, clears stale Seen/owner state and records `REOPENED`.

No attention occurrence is deleted merely because it is no longer live.

## Queues and permissions

`OPERATIONS` ownership is available to active ADMIN, OPERATIONS_MANAGER, DISPATCHER and SUPERVISOR users. `MANAGEMENT_REVIEW` ownership is available only to active ADMIN and SUPERVISOR users.

Reconciliation checks existing ownership. If an owner becomes inactive or no longer has the role required for the item's queue, ownership is cleared, the item returns to the eligible queue and an auditable reassignment activity is recorded.

`Mine` means:

- assigned to the current user; or
- currently unassigned in a queue the current user is eligible to work; plus
- for ADMIN, every unresolved `CRITICAL` item remains visible even when assigned to another user.

`All` returns every unresolved item in queues visible to the current role.

TECHNICIAN is not authorized for the management Needs Attention API or Dashboard command-centre surface; the Technician PWA remains separate and assignment-scoped.

## API

Protected roles: ADMIN, OPERATIONS_MANAGER, DISPATCHER, SUPERVISOR.

- `GET /api/v1/attention?view=mine|all` — reconciles current supported conditions, auto-resolves cleared conditions and returns ordered live items plus eligible owners.
- `PATCH /api/v1/attention/:id/seen` — records first Seen actor/time without resolving the item.
- `PATCH /api/v1/attention/:id/assignment` with `{ "ownerId": "<uuid>" }` or `{ "ownerId": null }` — assigns/reassigns/returns the item to its queue after active-role eligibility validation.

Each item includes a direct `actionHref` to the authoritative Work Order context. Phase 1 has no manual attention resolve endpoint.

## Deterministic ordering

Priority order is `CRITICAL`, `HIGH`, `NORMAL`. Within the same priority, a real due time sorts before no due time, earlier due times sort first, then older current occurrences sort first. No AI or opaque risk score participates.

## Dashboard presentation

The Dashboard order is:

1. Needs Attention
2. Today's Work
3. Shortcuts
4. Upcoming Work

The header count uses the current `Mine` attention result. Needs Attention provides `Mine` / `All`, owner selection, Seen and the direct resolution link. Today's status counts remain compact context under Today's Work rather than becoming a second exception feed.

## Recovery and operational behavior

Attention reconciliation is a derived-control workflow over authoritative Work Order state. If an attention read fails, the Dashboard reports partial operational unavailability and does not fabricate healthy state from missing data.

The reconciliation transaction uses PostgreSQL `SERIALIZABLE` isolation with bounded retry for serialization conflicts. Database uniqueness on `conditionKey` is the final duplicate boundary.

If attention data becomes inconsistent, investigate the source Work Order first. Do not manually delete attention history to make the Dashboard look clean. Correct authoritative source state where appropriate; the next successful reconciliation should resolve or reopen the derived occurrence truthfully.

## Deferred

- snooze and delegation;
- active/push notification delivery;
- future correspondence/finance/access/messaging producers;
- manual resolution of deterministic source conditions;
- automated shift handover;
- AI prioritization.
