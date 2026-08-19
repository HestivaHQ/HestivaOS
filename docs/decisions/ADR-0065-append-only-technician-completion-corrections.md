# ADR-0065: Use an append-only aggregate for Technician completion corrections

- **Status:** Accepted
- **Date:** 2026-08-19

## Context

A genuine factual error can be discovered after authoritative Technician completion. Destructive edits or a generic Work Order reopen would erase provenance or accidentally reopen scheduling, staffing, financial, scope, or correspondence decisions.

## Decision

ADMIN and SUPERVISOR alone authorize one active correction for exact frozen-scope sections and the original completing Technician. The Work Order remains `COMPLETED`. Corrections progress `AUTHORIZED` → `IN_PROGRESS` → `RESUBMITTED`; corrected results are new linked outcome events and original completion and operational histories remain immutable.

Authorization leaves acknowledgement current. The first accepted corrected outcome snapshots any acknowledgement not already captured, clears only the canonical current acknowledgement/correspondence-eligibility fields, and corrected resubmission must use the existing ADMIN/SUPERVISOR acknowledgement workflow again. Stable operation identities and the existing Technician IndexedDB operation store provide retry convergence and reviewable conflicts.

## Consequences

No scheduling, replacement visit, staffing, Job Leader, frozen scope, Finance, pricing, notification, messaging, or customer correspondence side effect is introduced. Management and Technician interfaces extend existing Work Order and checklist surfaces rather than creating a second completion-review application.
