# ADR-0037: Protect internal Quote review and defer acceptance until atomic conversion

- **Status:** Accepted
- **Date:** 2026-08-15
- **Extends:** ADR-0027 authoritative Quote domain

## Context

ADR-0027 reserved scalar linkage slots and decision metadata for later accepted-Quote orchestration. Guarded Website ingestion now creates immutable Quote revisions, but HestivaOS has no protected internal review/decision API and no atomic Customer/Property/operational conversion. Marking a Quote accepted before that conversion would permit accepted commercial records without their required operational records.

## Decision

- Internal Quote list, detail, readiness preflight and Decline are authenticated ADMIN-only API operations, separate from Website ingestion.
- Decline is a terminal, revision-checked decision. Its status metadata and `STATUS_CHANGED` activity commit atomically in a serializable transaction; an identical retry returns the existing decision and a conflicting retry fails closed.
- Preflight is non-mutating and reports deterministic blockers plus explicitly deferred orchestration blockers. It never presents acceptance as available in this slice.
- A nullable unique `acceptedRevisionId` references the immutable revision selected by a future acceptance transaction. This slice never populates it.
- Nullable Quote links to Work Order and Recurring Service Agreement are unique foreign keys with `ON DELETE RESTRICT`. They preserve accepted history and prevent one operational record being claimed by multiple Quotes.
- The referenced accepted revision must belong to the same Quote; frequency/link-shape rules and the requirement that `ACCEPTED` has complete metadata and operational links remain service invariants for the future atomic conversion because the current relational shape cannot express them cleanly without prematurely implementing that workflow.
- No API may transition a Quote to `ACCEPTED` until Customer/Property resolution and operational creation can complete in one serializable transaction.

## Consequences

Admins can review durable Quote state and decline safely, while accepted state remains unreachable through the new API. Database constraints prepare later idempotent conversion without introducing Customer, Property, Work Order or recurring creation here. Application rollback must preserve the additive accepted-revision column and linkage constraints unless a separately reviewed data-compatible database rollback is required.

## Review triggers

Review this decision when atomic accepted-Quote conversion is implemented, post-acceptance amendments are approved, decline reopening is approved, or operational deletion/retention policy changes.
