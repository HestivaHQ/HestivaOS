# ADR-0016: Use a canonical Employee Record with optional User and Technician links

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

`User` represents Supabase-backed application identity and OS authorization. `Technician` represents cleaning operations and owns crew, shift, and work-order relationships. Neither model can represent every Hestiva employee without mixing authentication, employment, and field-work concepts.

## Decision

Use `EmployeeRecord` as the canonical lean employment record. It has independent `ACTIVE`/`INACTIVE` employment status and optional unique, one-to-one links to `User` and `Technician`. User Access remains authoritative for `User.role` and `User.status`; Technician remains authoritative for existing operational relationships. The employee API never creates Auth accounts, changes OS access, deletes Technician rows, or deletes employee records.

The additive migration creates no employee rows and performs no inferred matching. Administrators may reconcile reliable links later. This preserves every existing User, Technician, crew, shift, and work-order relationship.

## Consequences

Employees without OS access and non-technician employees are valid. Linked records can display read-only access and crew summaries without duplicating credentials or scheduling data. Unique nullable foreign keys prevent one User or Technician from being linked to multiple employee records. Launch access is ADMIN-only. Payroll, leave, performance, documents, advanced HR workflows, and Supervisor/management permissions remain deferred.
