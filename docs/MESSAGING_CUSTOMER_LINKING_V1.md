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

## Admin identity review workflow

The ADMIN Messaging screen lists both WhatsApp and Messenger conversations and exposes only a safe derived review state: `UNLINKED`, `UNVERIFIED`, `TRUSTED`, `BLOCKED`, `RETIRED`, or `CONFLICT`. Raw WhatsApp phone/provider identity IDs and Messenger PSIDs are not returned to the browser by this review projection.

For a reviewable identity, an administrator may select an existing Customer, select or create an active contact, or create a new individual/organisation Customer and its first contact. Trust still requires a separate explicit confirmation and the trusted-identity API action. Creating or selecting a Customer/contact alone does not authorize the provider identity.

This workflow extends the existing Messaging admin surface and existing linking/trust services; it does not introduce a new runtime component or provider boundary.

`BLOCKED`, `RETIRED`, `CONFLICT`, and already `TRUSTED` identities are not presented as ordinary trust-establishment candidates. Messenger manual replies remain subject to the existing 24-hour provider window. WhatsApp remains inbound-only in this operational UI slice.

## Trusted identity resolution

HestivaOS may automatically link an unlinked conversation only when the exact provider identity already has a durable `CustomerMessagingIdentity` record that is:

- an exact match for channel, provider, and provider identity ID;
- explicitly `TRUSTED`;
- not retired; and
- attached to an active Customer contact.

If the exact identity is new, missing, `UNVERIFIED`, blocked, retired, or attached to a retired contact, automatic linking does not occur. The conversation stays on the identification/human-review path.

If an exact trusted identity points to a different Customer from an existing compatibility `MessagingConversation.customerId`, the system reports a conflict and does not silently reassign the conversation.

Existing historical conversation links are not converted into trusted identities automatically. Trust must be established deliberately in the new identity layer.

## Inbound webhook integration

After a WhatsApp or Messenger webhook has passed provider authentication/normalization and the inbound message has been durably persisted, the shared webhook path immediately runs trusted-identity resolution for that persisted conversation.

This ordering is deliberate:

1. provider authenticity and normalization happen first;
2. the inbound message is durably stored with its exact provider conversation/identity facts;
3. trusted-identity resolution runs against those durable facts; and
4. only an already active exact `TRUSTED` identity may attach an unlinked conversation to a Customer.

WhatsApp media securing continues after identity resolution and does not grant or alter identity trust. Provider status-only webhooks do not run Customer identity resolution because they do not represent a new inbound customer identity event.

Webhook retries remain safe: inbound message persistence is idempotent, trusted resolution is deterministic, and replay cannot create trust or silently move an existing Customer link.

## Safety rules

- the conversation must already exist;
- the selected Customer must already exist for a manual link;
- an unlinked conversation may be linked to one Customer;
- replay selecting the same Customer is idempotent;
- a conversation already linked to a different Customer fails with conflict;
- a concurrent competing link fails closed unless it resolves to the same Customer;
- provider identity, provider conversation identity and historical messages are never rewritten;
- phone/name/email/address similarity is discovery information only and never automatic authority;
- no fuzzy identity matching, automatic cross-channel merge, Customer auto-creation, unlink or silent reassignment is performed by inbound processing;
- automatic linking is limited to an exact active trusted identity as described above.

These operations do not themselves send a provider message, create a Quote, or change provider configuration.

## Follow-on use

The human-review path now exists for establishing the trusted Customer/contact relationship needed by later customer-specific messaging features. Automatic Quote creation is still not enabled by this document or workflow; deterministic Quote/service conversation flows and human takeover remain separate Phase 3 slices.

See ADR-0083, ADR-0087 and `MESSAGING_FOUNDATION_V1.md`.
