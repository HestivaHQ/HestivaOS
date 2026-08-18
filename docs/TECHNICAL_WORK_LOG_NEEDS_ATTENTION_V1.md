# Technical work log — Needs Attention Foundation v1

## 2026-08-18 — Phase 1 Dashboard Needs Attention foundation

### Coordination

- Canonical coordination issue: #125.
- Product baseline: Issue #73 canonical reconciliation Decisions 58–67.
- Architecture decision: ADR-0053.
- Pull request: #126 on `feat/needs-attention-foundation-v1` from the freshly merged `main` baseline.

### Implemented

- Added additive Prisma persistence for durable attention items and append-only activity history.
- Added stable condition identity, open/resolved lifecycle, occurrence count, owner, Seen metadata, queue, priority, subject identity/reference, customer label, action/deep-link metadata, due time, and observation timestamps.
- Added deterministic policy helpers for priority sorting, queue eligibility, and ownership.
- Added reconciliation from current authoritative Work Order state, including open, update, automatic resolution, reopen, and automatic return to queue when an owner is inactive or no longer eligible.
- Added protected attention list, Seen, and assignment API behavior.
- Added Mine/All filtering while preserving Critical visibility for Admin and queue/role boundaries.
- Added Dashboard Needs Attention as the first section ahead of Today's Work, Shortcuts, and Upcoming, with owner controls, Mark Seen, Mine/All, and Work Order deep links.
- Added only three producers whose conditions are currently authoritative: today-unassigned Work Order, overdue unresolved Work Order, and completed job awaiting management acknowledgement.
- Added focused API policy and web source-contract coverage preventing accidental expansion into unsupported Finance, Correspondence, Access, or Messaging producers.

### Hardening

- Reconciliation uses serializable transactions and retries both serialization/deadlock conflicts and first-observation unique-key races.
- Malformed owner identifiers are rejected as controlled bad requests before database lookup.
- Seen is explicitly independent from resolution.
- Correcting the authoritative condition auto-resolves the attention item; recurrence reopens the same durable identity instead of creating duplicate history.

### Documentation

- Added ADR-0053 and the focused Needs Attention foundation contract.
- Reconciled Roadmap, rationale/Why, Architecture, and Changelog.
- Added focused deployment and recovery records for this slice.

### Verification status

An earlier compiled PR run passed documentation policy, secret scan, typecheck, full build, and both PostgreSQL migration replay modes before later documentation commits cancelled/superseded that head. The final exact-head quality-gate run remains the merge authority; PR #126 must not merge while required checks are running or failing.

### Deliberately deferred

- Finance, Correspondence, Access, and Messaging producers without authoritative runtime conditions.
- Snooze and delegation.
- Push notifications.
- AI prioritization.
- Automated shift handover.
