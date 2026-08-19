# Work Order Access Operations v1

Status: Phase 3C implemented on 2026-08-19. Phase 3D WhatsApp/Messenger recovery and Finance remain deferred.

## Purpose

Phase 3C makes unresolved required visit access visible through the existing Needs Attention command centre and gives assigned Technicians a safe readiness signal. It extends the Phase 3A readiness state and Phase 3B credential-usability metadata; it does not create a parallel access or alert system.

## Deterministic appointment-relative escalation

For an operationally unresolved Work Order, the stable condition key remains `work-order:<work-order-id>:access-required`. Priority derives solely from the authoritative `scheduledAt` appointment and current time:

| Time remaining | Priority |
| --- | --- |
| More than 24 hours | `NORMAL` |
| 24 hours through exactly 4 hours | `HIGH` |
| Less than 4 hours | `CRITICAL` |
| At or after the appointment | `CRITICAL` |

There is no separate early-morning rule, timer, countdown record, or mutable escalation state. Each Needs Attention reconciliation recomputes priority from persisted facts, making the result deterministic, idempotent, restart-safe, and responsive to an authorized schedule correction. A priority change appends `PRIORITY_CHANGED` activity containing only the old/new priority and scheduled time.

## Resolution and credential usability

`NOT_REQUIRED` and `ARRANGED_ANOTHER_WAY` are resolved without credential storage. `RECEIVED` is operationally resolved only while at least one Phase 3B credential is accepted, not revoked, already valid, and not expired. Pending, rejected, revoked, not-yet-valid, or expired credentials are never represented as usable. Other readiness states remain unresolved.

The existing unique condition self-resolves when access or the operational Work Order lifecycle resolves. If access becomes unresolved again, reconciliation reopens that same row, increments its occurrence count, and derives the priority for the current appointment distance. Repeated reconciliation updates the existing row and does not create alert spam.

## Authorization and projections

ADMIN, OPERATIONS_MANAGER, DISPATCHER, and SUPERVISOR continue using the existing protected Needs Attention API and Dashboard. ADMIN and SUPERVISOR retain Phase 3A readiness authority. Only ADMIN retains Phase 3B credential management and explicit audited reveal authority.

The assignment-scoped Technician job DTO adds the canonical readiness state and `accessOperationallyResolved` boolean. It does not return credential count, type, review events, filename, validity timestamps, ciphertext, protected text, private storage path, or reveal capability. The Technician UI tells assigned workers whether access is arranged or requires management action and continues to show already-approved operational Property/visit instructions.

## Lifecycle and security isolation

Escalation never cancels, reschedules, reassigns, interrupts, completes, reopens, changes Execution Scope or Job Leader, sends correspondence, or creates Finance consequences. Needs Attention and Technician projections contain no protected credential value. Phase 3C introduces no secret-reading endpoint, notification transport, messaging provider, or customer contact action.

## API and UI

No new management route is required. `GET /api/v1/attention?view=mine|all` performs deterministic reconciliation and returns the existing stable access item with current priority. The existing Dashboard renders its priority and appointment due time. Existing Work Order readiness and ADMIN-only credential endpoints are unchanged.

Assigned Technician list/detail/cache responses now include safe access readiness and derived operational resolution. Offline caching therefore contains only that safe signal and existing authorized instructions, never credential metadata or contents.

## Deployment and recovery

Deploy migration `20260819120000_access_appointment_escalation` before the API. It adds only `PRIORITY_CHANGED` to the append-only attention activity enum. No environment-variable or storage change is introduced.

Recovery is forward-only. Correct authoritative Work Order schedule/readiness or credential lifecycle facts through existing authorized actions, then read Needs Attention again. Do not edit attention rows, fabricate credential usability, or change Work Order lifecycle to clear an access condition.

## 2026-08-19 Phase 3D integration

Recovery delivery/review metadata does not create another Needs Attention condition. The stable access-required condition and its priority continue to derive only from Phase 3A–3C persisted facts. Recovery never resolves access merely because a response arrived.
