# ADR-0074: Require human initiation for customer Correspondence delivery

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

ADR-0071 through ADR-0073 establish HestivaOS-owned Correspondence templates, immutable rendered records and provider-neutral delivery-attempt chains. The remaining Phase 2 question is the human-approval boundary before customer-facing delivery.

The product does not yet have an approved per-template or per-event vocabulary that safely distinguishes correspondence which may auto-send from correspondence that requires review. Inventing such a classification would create business policy ahead of product authority.

The existing runtime already provides a safe launch boundary: Correspondence record materialization and delivery-attempt creation are ADMIN-only, and every attempt records the initiating ADMIN identity in immutable event metadata. No runtime currently invokes a live transport provider or schedules retries automatically.

## Decision

Until a narrower automation policy is explicitly approved, **all customer-facing Correspondence delivery is human-initiated**.

1. Creating a provider-neutral `CorrespondenceDeliveryAttempt` is the explicit delivery-approval action for the exact immutable `CorrespondenceRecord` referenced by that attempt.
2. Only an authenticated active ADMIN may perform that action through the existing Correspondence API.
3. The initial `PENDING` event's server-stamped `initiatedBy` identity snapshot is the durable audit evidence of who approved/initiated that attempt.
4. A retry is also a new ADMIN-initiated attempt. There is no automatic retry scheduler, so a failed attempt cannot silently re-send without another human action.
5. Approval applies only to the exact immutable Correspondence record and exact attempt. Editing wording or recipient facts requires a new rendered record rather than mutating approved history.
6. Materializing a record is not itself delivery approval. A rendered record may exist indefinitely without any delivery attempt.
7. Provider acceptance remains only transport-boundary acceptance. It does not mean final recipient delivery or read confirmation.
8. No event-driven customer communication may create delivery attempts automatically under this policy.

This is intentionally conservative. It permits the remaining Phase 2 event-integration work to prepare/render auditable Correspondence state while preserving a hard human gate before any future provider adapter can send it.

## Relationship to Messaging human review

ADR-0052 remains authoritative for Quote-specific Messaging human-review behavior. This ADR does not weaken or replace that policy. Unsupported, ambiguous, manually priced or otherwise unsafe Quote requests still enter the Messaging human-review state described there.

## Consequences

- The existing runtime already enforces the approved launch boundary; no schema or API mutation is required for this decision.
- Every first attempt and retry remains attributable to an ADMIN actor.
- Automated event integration may prepare Correspondence records, but it must stop before delivery-attempt creation.
- A future decision may allow selected deterministic communication classes to auto-send, but that requires a new/superseding ADR with explicit eligibility, duplicate-send/idempotency, failure and escalation rules.
- Live provider adapters must consume an already-authorized delivery attempt rather than infer permission to send from a rendered record alone.

## Rejected alternatives

### Allow routine messages to auto-send now

Rejected because the repository has no approved classification of routine versus sensitive correspondence and no approved automated-trigger/idempotency policy yet.

### Treat materialization as approval

Rejected because rendering exact content and authorizing external delivery are separate business actions. Keeping them separate allows preview/audit history without implying send permission.

### Add a second mutable approval-status field

Rejected for the current launch boundary because the existing append-only ADMIN-initiated attempt already provides the required authorization and actor provenance without duplicating state.

## Review trigger

Revisit this decision only when product authority explicitly approves one or more correspondence classes for automatic delivery and defines their event trigger, idempotency/duplicate-send behavior, failure handling and human-escalation rules.
