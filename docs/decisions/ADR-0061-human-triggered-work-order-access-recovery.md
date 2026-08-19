# ADR-0061: Correlate human-triggered access recovery through canonical messaging

Date: 2026-08-19
Status: Accepted

## Context

Phase 3A–3C own visit access readiness, protected temporary credentials, and appointment-relative attention. Issue #116 owns provider-neutral WhatsApp/Messenger boundaries; Issue #132 approves a human-triggered recovery action and future inbound candidate ingestion. A parallel sender, inbox, access state, or automatic credential interpretation would break those boundaries.

## Decision

Persist canonical provider-neutral conversations/messages and a minimal visit-scoped `WorkOrderAccessRecovery` correlation. Only ADMIN may initiate a request through a configured Customer-linked canonical conversation. The constrained channel is explicit; the outbound message purpose and idempotency key are durable, and adapters retain authenticity/normalization/transport responsibility.

Preserve normalized inbound messages and provider-event replay identity. Associate a subsequent same-conversation response for review but never infer credential acceptance. An ADMIN may register that response through the Phase 3B protected credential command, with a unique source-message relation and stale/cross-visit guards. The existing Phase 3B review remains mandatory before `RECEIVED` can be operationally usable.

## Consequences

No adapter or provider secret is introduced here. Until a canonical adapter is registered and a provider identity has been deliberately linked to a Customer, recovery is unavailable. Retry safety depends on the stable adapter command idempotency key plus unique database identities. Messaging bodies and private attachment paths remain outside summary, Needs Attention, Dashboard, Technician, activity, and analytics projections. Work Order lifecycle and Finance remain unchanged.

## Review triggers

Revisit through a new ADR for autonomous customer contact, a new sending role, automatic identity matching, provider contract changes, content/legal commitments, attachment processing beyond existing private storage, or any lifecycle/Finance consequence.
