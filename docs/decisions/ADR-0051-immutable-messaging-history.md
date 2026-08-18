# ADR-0051: Keep persisted messaging history immutable

- **Status:** Accepted
- **Date:** 2026-08-18
- **Decision owners:** Homent
- **Related coordination:** HestivaOS Issue #116 — Homent Messaging Integration — WhatsApp + Messenger Coordination

## Context

Messaging Foundation v1 needs a durable record of what customers and Homent actually sent. Existing HestivaOS domains already preserve important business history through immutable snapshots and append-only activity rather than rewriting prior facts.

If a customer later corrects a request, or Meta later reports a delivery/read/failure state, rewriting the original message would destroy the historical record and make retries, disputes, human takeover and later AI interpretation harder to reason about.

## Decision

Persisted inbound and outbound message content and provenance are immutable after creation.

Later facts are represented separately:

- customer corrections are new inbound messages;
- Homent follow-ups are new outbound messages;
- delivery/read/failure changes are new provider/message status events or current state derived from those events;
- the current conversation or Quote draft may change as new facts arrive, without rewriting earlier messages.

This decision does not require keeping raw provider webhook payloads. ADR-0050 remains authoritative that HestivaOS persists normalized provider data rather than complete Meta payload JSON.

## Consequences

### Positive

- Conversation history remains a faithful record of what was sent and received.
- Retry and audit behaviour is easier to reason about.
- Customer corrections do not erase earlier context.
- Human handoff and later AI interpretation can inspect a trustworthy history.

### Trade-offs

- Message status/history requires additional append-only event/state records instead of simple in-place edits.
- Current conversation state must be derived or updated separately from immutable message history.

## Out of scope

- Exact Prisma model names and indexes;
- media storage ownership;
- PII/redaction mechanics;
- retention cleanup implementation;
- live Meta webhook/provider code.
