# ADR-0083: Deliberate messaging provider-identity to Customer linking

## Status

Accepted — 2026-08-21

## Context

HestivaOS persists WhatsApp and Messenger conversations using provider-scoped identities. Those identities are transport facts and are not canonical HestivaOS `Customer` identities. The existing `MessagingConversation.customerId` field is nullable so a conversation can remain an enquiry without prematurely creating or assuming a Customer.

Phase 3 requires a deliberate provider-identity ↔ canonical Customer linking boundary before deterministic customer-specific messaging flows and broad operator handling are added.

Automatic fuzzy matching is unsafe across names, Page-scoped sender IDs and phone identities. Silent reassignment is also unsafe because downstream workflows may rely on the current Customer link.

## Decision

HestivaOS will provide an explicit ADMIN-only conversation-to-Customer linking operation.

For v1:

- the conversation must already exist;
- the target canonical Customer must already exist;
- an unlinked conversation may be linked to exactly one Customer;
- replay selecting the same Customer is idempotent;
- a conversation already linked to a different Customer fails with conflict;
- no automatic fuzzy/name-only matching is performed;
- the provider identity, provider conversation identity and immutable message history are never rewritten by linking;
- no unlink/reassignment semantics are introduced in this slice.

The current nullable `MessagingConversation.customerId` relation is the canonical link, so no schema migration is required for this first boundary.

## Consequences

Customer-specific messaging features may now depend on an explicit canonical Customer link rather than treating provider identity as Customer identity.

Corrections or deliberate reassignment require a separately approved workflow rather than silently overwriting the existing link.

This does not create a general inbox, Customer auto-creation, deterministic Quote automation, human takeover, or AI behavior.

## Coordination

Messaging coordination source: `HestivaHQ/HestivaOS#116`.
