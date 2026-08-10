# ADR-0023: Make Property the live operational home profile

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

Persistent home, access, household, and care facts are useful across visits. Storing them on each Work Order would create repeated, conflicting data, while generic selectors must not disclose sensitive household context.

## Decision

Property owns nullable controlled room/storey facts, nullable logistics/household indicators, and concise persistent operational notes. Province remains dormant and preserved. Work Orders read the current Property profile without copying or snapshotting it and keep visit-specific facts and exceptions. A lean Property selector returns identifying fields only; existing authorization remains unchanged, and Technician Work Order presentation includes only actionable operational context.

Floor-size, outdoor-area, and entry-method controls wait for approved persistent vocabularies. Recurrence, catalogue/scope reconciliation, quote handoff, and assignment redesign remain outside this decision.

## Consequences

Historical Properties remain valid with unknown values represented by null. Operators can enrich profiles progressively. Updates are immediately visible on related Work Orders, so this slice does not provide historical snapshot semantics. Household details stay out of generic relationship selection while remaining available where operationally required.
