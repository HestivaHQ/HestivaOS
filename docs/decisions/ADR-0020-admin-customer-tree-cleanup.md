# ADR-0020: Isolate destructive Customer-tree cleanup behind exact ADMIN authorization

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

Normal Customer deletion deliberately denies removal when Properties or Work Orders exist. Test administration nevertheless needs a way to reset a complete Customer operational scenario without weakening that protection or deleting shared canonical records.

## Decision

Keep normal `DELETE /customers/:id` unchanged. Add separate ADMIN-only impact and cleanup contracts under `/admin/customer-cleanup`. Require the authoritative Contact-first display name exactly, and re-evaluate the Customer and impact in a single Prisma transaction before explicitly deleting owned records in dependency order.

Owned records are WorkOrderActivity, WorkOrderChecklistItem, WorkOrderPhoto metadata, WorkOrderCustomerSignOff, WorkOrder, Property, and Customer. Shift is shared, so only its Work Order relationship is cleared. Service, User, EmployeeRecord, Technician, Crew, BusinessListOption, BusinessProfile, Supabase identity, shared configuration, and unrelated data are preserved.

The repository has no safe Storage deletion service. Photo database metadata is deleted, Storage objects are not, and the result must report possible orphan risk. Audit logging remains identifier/count-only in application logs because no persistent general audit model exists.

## Consequences

Cleanup is atomic and intentionally destructive but cannot be triggered through ordinary Customer UI or normal deletion. Operators must understand that database backup recovery is the only restoration path. Storage orphan reconciliation remains future work. Tests must cover role denial, exact confirmation, owned deletion, shared preservation, counts, and transaction failure.
