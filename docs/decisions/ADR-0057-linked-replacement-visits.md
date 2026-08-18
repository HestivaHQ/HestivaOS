# ADR-0057: Linked replacement visits preserve attempted-visit history

Status: Accepted
Date: 2026-08-18

## Context

An interrupted Work Order is an authoritative record of an attempted visit. Rescheduling that same record would erase or blur attendance, frozen scope, field outcomes, evidence and interruption history. Phase 2C therefore left replacement creation to a separate slice.

## Decision

A replacement visit is a new Work Order linked through append-only replacement provenance to the interrupted Work Order. The original remains `INTERRUPTED` and is never moved to the replacement service time.

Replacement creation requires an existing authoritative interruption whose latest management route is `REPLACEMENT_VISIT`. ADMIN or SUPERVISOR chooses the new service date/time and submits a stable operation UUID. Creation is idempotent, and one interruption can produce at most one replacement Work Order.

The replacement carries forward customer, property, primary service, add-ons, recurring-agreement association, booked context and non-secret visit instructions. It starts `NEW` and unassigned. Technician/crew assignments, Job Leader, execution scope revisions, section outcomes, evidence, temporary access credentials, completion/interruption fields and customer-correspondence state are not copied.

Replacement creation resolves the interrupted-visit Needs Attention condition. Finance and customer correspondence are explicit integration boundaries and no policy or transaction is inferred here.

## Consequences

Operational history stays truthful and auditable. Dispatch can schedule and assign the replacement independently. Visit-scoped secrets and field evidence cannot leak into the new visit. Recurring-service lineage is retained without reusing the original recurrence date.

## Alternatives rejected

- Moving the original interrupted Work Order to a new date: rejected because it destroys attempted-visit truth.
- Reopening the interrupted Work Order: rejected because interruption is a terminal field outcome for that attempt.
- Copying previous assignments/evidence/access credentials: rejected because they are visit-specific and can be stale or sensitive.

## Review triggers

Revisit if Hestiva adopts multi-replacement chains from a single attempt, introduces a canonical financial treatment for replacement visits, or adds automated customer correspondence for replacement scheduling.
