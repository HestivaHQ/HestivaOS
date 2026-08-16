# ADR-0039: Convert accepted ONE_TIME Quotes atomically

- **Status:** Accepted
- **Date:** 2026-08-16
- **Supersedes in part:** ADR-0037 acceptance deferral
- **Extends:** ADR-0038 match resolution

## Context

Quote review and durable Customer/Property resolution exist, but marking a Quote accepted separately from operational creation could leave accepted commercial state without the visit that Operations must deliver. Retries and concurrent Admin decisions must not duplicate Customers, Properties, or Work Orders.

## Decision

`PATCH /api/v1/quotes/:id/accept` is ADMIN-only and accepts only a current-revision, `SUBMITTED`, unexpired `ONE_TIME` Quote with current durable Customer and Property decisions, stored evidence, and a complete canonical Service projection. One Prisma `SERIALIZABLE` transaction validates the immutable revision, consumes or materializes both resolutions, creates one Work Order and its add-ons/activity, links the exact revision and operational records, changes status, and appends Quote acceptance activity. PostgreSQL serialization failures receive bounded retries.

Complete identical retries recover the existing linked result. Stale or incompatible accepted state fails closed. Unique Quote-to-Work-Order/revision links, restricted Customer/Property foreign keys, and an accepted-state shape check participate in enforcing the invariant; application compare-and-set remains required for same-Quote revision ownership and ONE_TIME frequency.

The Work Order receives the canonical primary Service, `ONE_TIME` frequency, home condition, preferred service date, accepted add-ons and exact quantities, and Quote attention/renovation/appliance/additional notes in its existing visit description. A newly created Property receives only fields with established Property ownership. Preferred time window, exact floor, building access, access/key/parking detail, source photos, pricing snapshot, eco preference, flexibility/urgency, and other source-only facts remain immutable on the accepted Quote revision because no non-lossy authoritative Work Order destination exists yet.

Recurring conversion and `RecurringServiceAgreement` creation remain unsupported.

## Consequences

An accepted ONE_TIME Quote cannot commit without its required operational result, and transaction rollback removes all intermediate records and audit rows. Direct Work Order creation and Website ingestion remain independent and unchanged. Recurring acceptance and non-lossy projection of remaining source-only fields require later focused decisions.

## Review triggers

Review when recurring Quote conversion, time-window scheduling, Work Order commercial snapshots, Quote-photo operational linkage, or exact-floor/access handoff is implemented.
