# ADR-0084: Bound manual Messenger replies to explicit ADMIN action

## Status

Accepted — 2026-08-20.

## Context

The Meta Messenger provider edge already supports guarded standard-window TEXT replies, but HestivaOS has no general operator surface that creates a durable outbound message and invokes that transport. Testing the live outbound path through the Work Order access-recovery workflow would couple a messaging diagnostic to unrelated Work Order state.

A manual reply also must not bypass the existing durable-message, idempotency, 24-hour eligibility or unknown-outcome safeguards.

## Decision

1. HestivaOS exposes an ADMIN-only Messenger conversation list and manual TEXT reply action.
2. Manual replies create a durable `MessagingMessage` with `GENERAL` purpose and a caller-supplied UUID-backed idempotency key before provider delivery.
3. HestivaOS checks that the same conversation has a customer inbound message within the preceding 24 hours before creating a new manual reply; `MessagingService.send()` independently rechecks the same rule before the provider call.
4. The existing Messenger adapter remains the only Meta Send API boundary and retains the ADR-0082 fail-closed unknown-outcome behavior.
5. Replaying the same request identity with the same conversation/text reuses the durable message. Reusing it for different content or another conversation fails with conflict.
6. Manual Messenger replies do not require a canonical Customer link. An enquiry may remain deliberately unlinked while an ADMIN answers it.
7. This is a bounded operator/manual-reply foundation, not a complete inbox, assignment/takeover lifecycle, automated conversation engine, or out-of-window messaging feature.

## Consequences

HestivaOS can test and use the live Messenger outbound path without abusing Work Order workflows or calling Meta outside the provider adapter. Broader human takeover, operator ownership, conversation-state transitions and automation hand-back remain separate work.
