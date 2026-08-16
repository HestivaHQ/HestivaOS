# ADR-0040: Convert accepted recurring Quotes atomically

- **Status:** Accepted
- **Date:** 2026-08-16
- **Supersedes in part:** ADR-0039 recurring-conversion deferral
- **Extends:** ADR-0026, ADR-0038, and ADR-0039

## Context

Recurring Quote acceptance must create both the ongoing operational commitment and its first visit. Creating or linking either record separately could leave an accepted commercial decision that Operations cannot safely fulfil, while retries could duplicate agreements or visits.

## Decision

The existing ADMIN `PATCH /api/v1/quotes/:id/accept` dispatches by the immutable accepted submission frequency. `ONE_TIME` retains ADR-0039 behavior. Canonical `WEEKLY`, `EVERY_TWO_WEEKS`, `MONTHLY`, and `CUSTOM` create one Property-owned `RecurringServiceAgreement` and one linked initial `NEW` Work Order in the same bounded-retry Prisma `SERIALIZABLE` transaction used for Customer/Property materialization, Quote linkage, accepted-revision identity, and audit.

The preferred date is the agreement effective date and initial Work Order recurrence date. Weekly variants derive the controlled weekday from that date; monthly derives its calendar day; CUSTOM retains its required prose note and receives only this explicitly approved initial visit. Preferred time maps to the agreement's existing controlled time-window field without fabricating a Work Order timestamp. The agreement and initial visit snapshot the canonical primary Service, frequency, instructions, add-ons, and exact positive quantities. The initial visit additionally receives home condition. Laundry and Ironing loads remain quantities on both records.

A complete retry is recoverable only when the Quote revision, agreement, and linked Work Order agree. Conditional Quote transition, unique Quote operational links, unique agreement/occurrence identity, and the accepted-shape check protect concurrent calls. Any failure rolls back all writes.

## Consequences

Supported recurring acceptance is operationally complete with one initial visit and does not bulk-generate a future calendar. Ordinary recurring CRUD/generation and Website ingestion, authentication, validation, replay, and pricing remain unchanged. The accepted revision remains authoritative for commercial pricing and source-only fields without safe destinations.

Review UI and non-lossy handoff for exact floor/access, alternative/flexible timing, parking/key/presence detail, photos, eco preference, existing damage, commercial snapshots, and other source-only context remain later work. Issue #79 remains historically closed.
