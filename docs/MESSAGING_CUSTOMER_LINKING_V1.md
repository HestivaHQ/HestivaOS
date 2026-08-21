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
- `PUT /api/v1/messaging/conversations/:conversationId/trusted-identity`

The customer-link PUT body contains exactly the selected canonical `customerId`.

The trusted-identity PUT body contains exactly the selected canonical `contactId`. It does not accept a provider identity from the caller. The channel, provider and provider identity ID are taken from the already-persisted conversation so an administrator cannot accidentally trust a different transport identity than the one being reviewed.

## Deliberate trust establishment

A messaging identity becomes `TRUSTED` only through the authenticated ADMIN-only trusted-identity action. An inbound webhook, customer-supplied name/number, display name, phone similarity, email similarity, property match or AI interpretation cannot establish trust.

When an administrator establishes trust:

- the conversation must already exist;
- the selected Customer contact must already exist and be active;
- the exact provider identity is taken from that persisted conversation;
- an existing identity linked to another contact fails with conflict;
- a blocked or retired identity fails closed and is not silently reactivated;
- a conversation already linked to another Customer fails with conflict;
- a new or same-contact `UNVERIFIED` identity may become `TRUSTED`;
- the conversation is linked to the contact's Customer if it was previously unlinked; and
- the trust establishment is recorded as an idempotent durable `SYSTEM` message containing the acting HestivaOS admin user ID, Customer ID, contact ID and messaging identity ID.

Replaying the same trusted-identity action for an already trusted exact identity/contact relationship is idempotent and does not create another trust audit event.

This slice does not provide an implicit unblock, unretire, reassignment or trust-revocation path. Those actions require their own explicit reviewed workflow rather than overloading trust establishment.

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

These operations do not themselves send a provider message, create a Quote, create a Customer, or change provider configuration.

## Follow-on use

Customer-specific messaging features may use the trusted identity result before a conversation is used as a canonical Customer channel. New or unclear identities still require an identification or human-review workflow. Deterministic Quote/service conversation flows and human takeover remain separate Phase 3 slices.

See ADR-0083, ADR-0087 and `MESSAGING_FOUNDATION_V1.md`.
