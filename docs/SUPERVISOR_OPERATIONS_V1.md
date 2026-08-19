# Supervisor Operational Review v1

Status: Phase 4B implemented contract.
Date: 2026-08-19.

## Purpose

`/supervisor/operations` is the focused, exception-first SUPERVISOR entry point. It combines the existing Needs Attention Mine view with a read-only projection of today's, active, interrupted, incident-bearing, and completion-review Work Orders. It is not a second Operations domain and persists no review status.

The projection exposes safe labels, schedule/lifecycle state, Technician assignment and Job Leader, access-readiness state, checklist outcome counts, evidence synchronization counts, pending completion acknowledgement, unresolved incident summaries, interruption state, and scope-mismatch counts. Details deep-link to the authoritative Work Order surfaces. Healthy jobs remain collapsed.

## Authority

Existing authority is unchanged. SUPERVISOR may use existing Needs Attention Seen/assignment behavior, update access readiness, acknowledge authoritative Technician completion, review incidents, route interruptions, and create a replacement after an authorized replacement route. SUPERVISOR may read scope mismatches and material-change history.

ADMIN alone continues to assign Technicians/Crews/Job Leader, mutate Work Orders, resolve scope mismatch/additional work, manage or reveal protected temporary credentials, initiate access recovery, manage Customer/Property truth, user access, providers, and configuration. This surface has no Finance, price, correspondence, liability, HR, insurance, or completed-history mutation authority.

## API and security

`GET /api/v1/supervisor/operations` requires exactly the SUPERVISOR role and projects canonical Work Order relations. It returns evidence counts and synchronization state only: no storage path, blob, access instructions, temporary credential metadata/content, recovery context, or unrelated private customer data. Existing per-domain endpoints remain the only mutation boundaries.

No Prisma model or migration is introduced. Needs Attention retains stable condition identity, deterministic priorities, Mine/All permissions, eligible owners, Seen distinct from resolution, and automatic source-driven resolution/reopen.

## Deferred

Notification delivery, Finance, customer correspondence, Technician correction/reopen, private evidence-read hardening, scheduling/dispatch redesign, HR/legal/liability outcomes, and any broader SUPERVISOR authority remain separate work.
