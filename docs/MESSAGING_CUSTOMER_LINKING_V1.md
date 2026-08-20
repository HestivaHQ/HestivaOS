# Messaging Customer Linking v1

## Status

This document records the first deliberate provider-identity to canonical Customer linking boundary for the shared HestivaOS messaging runtime. Coordination source: `HestivaHQ/HestivaOS#116`.

## Boundary

A WhatsApp or Messenger provider identity is not a canonical HestivaOS `Customer`. Provider identities and provider conversation IDs remain transport facts even after a conversation is linked to a Customer.

HestivaOS uses the existing nullable `MessagingConversation.customerId` relation as the canonical link. A conversation may remain unlinked indefinitely while it is only an enquiry.

## API

ADMIN-only routes:

- `GET /api/v1/messaging/conversations/:conversationId/customer-link`
- `PUT /api/v1/messaging/conversations/:conversationId/customer-link`

The PUT body contains exactly the selected canonical `customerId`.

## Safety rules

- the conversation must already exist;
- the selected Customer must already exist;
- an unlinked conversation may be linked to one Customer;
- replay selecting the same Customer is idempotent;
- a conversation already linked to a different Customer fails with conflict;
- a concurrent competing link fails closed unless it resolves to the same Customer;
- provider identity, provider conversation identity and historical messages are never rewritten;
- no fuzzy name matching, automatic cross-channel merge, Customer auto-creation, unlink or reassignment is performed in v1.

This operation does not itself send a message, create a Quote, create a Customer, or change provider configuration.

## Follow-on use

Customer-specific messaging features may require this explicit link before using a conversation as a canonical Customer channel. Deterministic Quote/service conversation flows and human takeover remain separate Phase 3 slices.

See ADR-0083 and `MESSAGING_FOUNDATION_V1.md`.
