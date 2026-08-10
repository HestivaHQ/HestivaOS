# ADR-0022: Separate accepted-quote data by operational ownership

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

An accepted website quote combines customer identity, persistent property context, service catalogue selections, visit facts, and possible recurring intent. Copying every answer onto Work Order would create competing records and obstruct later recurring-agreement design.

## Decision

Customer owns identity/contact and Property owns persistent home/access context. Work Order represents one operational accepted quote visit and owns one canonical primary Service (`serviceId`), zero-to-many canonical add-ons through `WorkOrderAddOn`, a nullable controlled frequency snapshot, nullable controlled home condition, timing, visit instructions, and assignment. Historical null/inactive relationships remain readable; only newly assigned catalogue relationships must be active and correctly typed. A CUSTOM frequency note is descriptive only.

Recurring-agreement rules and lifecycle are deferred to Slice 5L, catalogue/scope reconciliation to 5K, missing Property fields to 5J, and automated website handoff to 5M.

## Consequences

The schema remains additive and preserves Work Order history. Operators reuse Customer and Property facts through relationships and read-only summaries. Quote handoff can later address stable canonical IDs, but this decision introduces no webhook, recurrence generation, pricing, or media architecture.
