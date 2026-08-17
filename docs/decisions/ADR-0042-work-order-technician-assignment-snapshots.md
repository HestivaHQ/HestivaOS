# ADR-0042: Make Work Order Technician assignments explicit snapshots

- **Status:** Accepted
- **Date:** 2026-08-17

## Context

The legacy Work Order stored one nullable `technicianId` and an optional Crew. Crew membership could identify a current group but could not preserve the one-or-many people responsible for a historical job when membership later changed.

## Decision

`WorkOrderTechnician` is the authoritative normalized, job-specific assignment between a Work Order and the existing canonical `Technician`. Its composite primary key prevents duplicates and its Technician-first index supports later assigned-job queries. Zero rows means the Work Order is legitimately unassigned. The legacy nullable `technicianId` remains a compatibility projection of the first explicit assignment and is backfilled into the new join during migration.

ADMIN is the only role authorized to mutate assignment. Newly added Technicians must be active; when linked to an Employee Record, that record must also be active. Existing inactive historical assignments remain readable and removable.

A selected active Crew prepopulates its currently active members when no explicit set is supplied. The browser presents that set for job-specific additions/removals, and saving copies only the explicit Technician identifiers to the Work Order join. The Crew reference is context; later Crew membership changes never rewrite Work Order assignments.

## Consequences

One-person jobs need no Crew, multi-person jobs use the same relationship, and direct, Quote-created, and recurring-generated Work Orders share one optional assignment model. Existing and newly generated unstaffed Work Orders remain valid. Cleaner job execution, dispatch optimization, recurring staffing templates, and notifications are not introduced by this decision.
