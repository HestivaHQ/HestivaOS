# ADR-0094: Separate conversation authority from Quote human review

- **Status:** Accepted
- **Date:** 2026-09-03
- **Related coordination:** HestivaOS Issue #116

## Context

HestivaOS persists provider-neutral WhatsApp and Messenger conversations and runs deterministic Quote collection after authenticated inbound events have been normalized and stored. Quote `HUMAN_REVIEW` already represents the need for human business judgement about a Quote. ADR-0052 deliberately limited that state to Quote-specific decisions and deferred the final operator takeover interface.

An operator also needs to be able to control an entire conversation without dropping inbound events, rewriting immutable message history, or allowing deterministic automation and human replies to overlap. Treating that authority as Quote `HUMAN_REVIEW` would collapse two independent concerns: whether a Quote needs business review and whether automation is currently allowed to act on a conversation.

## Decision

1. Each messaging conversation has one provider-neutral control state: `AUTOMATION` or `HUMAN_TAKEOVER`. Existing and newly created conversations default to `AUTOMATION`.
2. Conversation authority is independent of Quote `HUMAN_REVIEW`. Taking over or returning control does not resolve, clear, or otherwise mutate Quote review state.
3. Only an authenticated HestivaOS `ADMIN` may take over a conversation or return it to automation in v1.
4. Every successful transition atomically updates current conversation state and appends an actor-attributed audit event containing the action, previous state, resulting state, resulting version, request identity, and timestamp. Transition requests use idempotency and optimistic version checks so stale actions fail closed.
5. `HUMAN_TAKEOVER` does not stop provider webhook authentication, normalization, provider-event idempotency, inbound message persistence, trusted-identity resolution, or approved secure inbound-media handling.
6. After inbound persistence, `HUMAN_TAKEOVER` suppresses customer-facing deterministic processing for that conversation. The inbound event must not advance guided Quote state, invoke WhatsApp Flow processing, or cause an automated provider send.
7. Returning to `AUTOMATION` is explicit and affects subsequent eligible inbound events only. Messages received during takeover remain immutable history and are not automatically replayed or reinterpreted as pending Quote answers.
8. Human takeover does not relax provider policy. Manual Messenger replies retain the standard-window, text-only, explicit-ADMIN boundary; no unrestricted WhatsApp manual-send path is created.

## Consequences

- Operators can safely pause conversation automation without losing authenticated inbound history.
- Quote business-review state and conversation authority can vary independently and retain their own explicit transitions.
- Current authority and its history are auditable without modifying `MessagingMessage` content.
- Stale operator actions are rejected rather than silently overwriting a newer handoff.
- Handback is intentionally forward-only; an operator must deal deliberately with any takeover-period context because automatic backlog replay could duplicate or surprise business effects.
- Automation must check authoritative conversation control at the shared post-persistence orchestration boundary and again before an automated provider send.

## Non-goals and boundaries

This decision does not introduce:

- agent assignment, reassignment, teams, queues, or SLA timers;
- a second messaging inbox;
- AI control or AI-generated replies;
- typing indicators, read receipts, or general CRM behavior;
- Messenger tags, sponsored messaging, out-of-window workarounds, or media outbound;
- an unrestricted WhatsApp operator-send path;
- Meta, WhatsApp Business Account, production-number, webhook, credential, coexistence, payment, or WhatsApp Flow configuration changes.

## Relationship to existing decisions

- ADR-0048 remains authoritative for provider-neutral shared messaging logic.
- ADR-0051 remains authoritative for immutable persisted message history.
- ADR-0052 remains authoritative for Quote `HUMAN_REVIEW`; this ADR resolves its explicitly deferred conversation-takeover and handback decision without changing Quote review semantics.
- ADR-0078 remains authoritative for WhatsApp provider-edge authenticity.
- ADR-0082 and ADR-0084 remain authoritative for Messenger outbound and manual-reply safety.

## Review triggers

Review this decision if HestivaOS adds non-ADMIN operator authority, assignment/routing ownership, automated backlog reconciliation, a materially different provider policy, or a new automation engine that cannot honor the shared conversation-control boundary.
