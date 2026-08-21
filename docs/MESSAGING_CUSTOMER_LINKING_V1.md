# Messaging Customer Linking v1

## Status

This document records the deliberate provider-identity to canonical Customer linking boundary for the shared HestivaOS messaging runtime. Coordination source: `HestivaHQ/HestivaOS#116`.

## Boundary

A WhatsApp or Messenger provider identity is not a canonical HestivaOS `Customer`. Provider identities and provider conversation IDs remain transport facts even after a conversation is linked to a Customer.

HestivaOS keeps the existing nullable `MessagingConversation.customerId` relation as the current conversation-level compatibility link while the durable Customer contact and messaging-identity layer is introduced under ADR-0087. A conversation may remain unlinked indefinitely while it is only an enquiry.

## Manual API

ADMIN-only routes:

- `GET /api/v1/messaging/conversations/:conversationId/customer-link`
- `PUT /api/v1/messaging/conversations/:conversationId/customer-link`

The PUT body contains exactly the selected canonical `customerId`.

## Trusted identity resolution

HestivaOS may automatically link an unlinked conversation only when the exact provider identity already has a durable `CustomerMessagingIdentity` record that is:

- an exact match for channel, provider, and provider identity ID;
- explicitly `TRUSTED`;
- not retired; and
- attached to an active Customer contact.

If the exact identity is new, missing, `UNVERIFIED`, blocked, retired, or attached to a retired contact, automatic linking does not occur. The conversation stays on the identification/human-review path.

If an exact trusted identity points to a different Customer from an existing compatibility `MessagingConversation.customerId`, the system reports a conflict and does not silently reassign the conversation.

Existing historical conversation links are not converted into trusted identities automatically. Trust must be established deliberately in the new identity layer.

## Safety rules

- the conversation must already exist;
- the selected Customer must already exist for a manual link;
- an unlinked conversation may be linked to one Customer;
- replay selecting the same Customer is idempotent;
- a conversation already linked to a different Customer fails with conflict;
- a concurrent competing link fails closed unless it resolves to the same Customer;
- provider identity, provider conversation identity and historical messages are never rewritten;
- phone/name/email/address similarity is discovery information only and never automatic authority;
- no fuzzy identity matching, automatic cross-channel merge, Customer auto-creation, unlink or silent reassignment is performed;
- automatic linking is limited to an exact active trusted identity as described above.

This operation does not itself send a message, create a Quote, create a Customer, or change provider configuration.

## Follow-on use

Customer-specific messaging features may use the trusted identity result before a conversation is used as a canonical Customer channel. New or unclear identities still require an identification or human-review workflow. Deterministic Quote/service conversation flows and human takeover remain separate Phase 3 slices.

See ADR-0083, ADR-0087 and `MESSAGING_FOUNDATION_V1.md`.
