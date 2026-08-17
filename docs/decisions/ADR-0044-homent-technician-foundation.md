# ADR-0044: Homent Technician role-focused offline foundation

- Status: Accepted
- Date: 2026-08-17

## Context

ADR-0043 established canonical Crew Leaders, Work Order Job Leader snapshots, and the shared Employee/Technician identity needed for field execution. The Technician experience must remain assignment-scoped even for an ADMIN user, work on constrained phones and unreliable networks, and make one Work Order start retry-safe.

## Decision

Homent Technician is a route-focused PWA under `/technician` in the existing Next.js application and uses the existing authentication identity and NestJS backend. Purpose-built `/technician/jobs` projections resolve `User -> EmployeeRecord -> Technician` and enforce current normalized Work Order assignment in every list, detail, and Start Job query. Application role does not widen this scope.

Today is the default; Upcoming, Recent, and the bounded cache feed remain assignment-scoped. IndexedDB schema version 1 stores minimized job packages and durable unique outgoing Start Job operations. Reconciliation is opportunity-driven at launch/open, visibility restoration, connectivity restoration, and retry rather than polling. A narrowly scoped service worker supplies the installable shell; IndexedDB, not the HTTP cache, owns operational state.

Start Job is authorized only for the current `WorkOrder.jobLeaderId`, transitions an eligible Work Order to canonical `ON_SITE`, records the device field timestamp separately as `startedAt`, attributes the Technician, and creates one `JOB_STARTED` activity. A unique operation UUID plus optimistic `updatedAt` context makes identical delivery idempotent and makes stale or incompatible delivery fail closed.

Push notifications are deferred. Future critical-change alerts are hints only; authenticated reconciliation remains authoritative. Protected access-credential retrieval, checklists, evidence, incidents, completion, and Supervisor functionality are also deferred and are not placed in the generic Technician projection or offline cache.

## Consequences

The role-focused experience does not duplicate the Next.js application, account, Technician record, or backend domain. Offline Start can truthfully report device persistence before server acknowledgement; authoritative cancellation, assignment removal, leadership change, or version conflict may reject it during reconciliation, and pending conflicting facts are retained rather than silently discarded. The initial cache window is Today plus two days, with active/pending retention foundations available for later field slices.
