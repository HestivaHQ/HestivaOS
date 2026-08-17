# ADR-0043: Crew and Work Order leadership snapshots

- Status: Accepted
- Date: 2026-08-17

## Context

ADR-0042 made Work Order Technician assignments explicit snapshots, but Crew leadership was optional and Work Orders had no canonical Job Leader. Operational leadership must not be inferred from the system-wide `SUPERVISOR` authorization role.

## Decision

An active Crew is a reusable staffing preset with one or more eligible Technicians and exactly one member designated as Crew Leader. A sole member is selected automatically. Crew leadership confers no application role or authorization.

A staffed Work Order owns one Job Leader selected from its assigned Technicians. A sole assignment is selected automatically; selecting a Crew initially defaults to its Crew Leader. The stored Work Order value is independent after assignment, so later Crew edits never rewrite it. ADMIN is the only current role permitted to mutate Crew or Work Order staffing and leadership.

`job_leader_id` is nullable only for Unassigned Work Orders and safely preserved legacy multi-Technician rows whose leader cannot be established. Migration backfills only Work Orders with exactly one normalized assignment. Admin must explicitly resolve legacy multi-person rows.

The current lifecycle does not identify a distinct Start Job event. ADMIN reassignment is audited as `JOB_LEADER_CHANGED`; reason-required active-job leadership transfer and future Job Leader execution permissions are deferred to Cleaner Job Execution.

## Consequences

Crew and Job leadership remain distinct from organizational capabilities. Existing assignment attribution and Quote/recurrence generation remain unchanged. Future shared-backend role-focused apps can authorize execution against the canonical Work Order Job Leader without duplicating employee identities or domains.
