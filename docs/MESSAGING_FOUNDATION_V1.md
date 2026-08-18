# Messaging Foundation v1

## Status

Messaging Foundation v1 establishes the channel-neutral contract boundary for Homent customer messaging. It does **not** expose a live webhook, persist conversations, call Meta, calculate a Quote, create a Customer/Property, or perform a booking action.

Coordination source: `HestivaHQ/HestivaOS#116`.

## Goals

The foundation keeps WhatsApp and Facebook Messenger as provider channels around one shared HestivaOS conversation boundary. HestivaOS remains authoritative for Customers, Properties, Quotes, pricing, Work Orders, recurring services, payments, and operational state.

The contract is intentionally deterministic-first. Provider adapters normalize external events and send already-authorized outbound commands. They do not decide price, availability, booking state, payment state, discounts, Customer identity, or operational outcomes.

A governing implementation rule is **reuse before invention**: customer data, validation, retention and lifecycle decisions already established by the live Website and HestivaOS are inherited unless messaging has a genuinely channel-specific requirement that those systems do not answer.

## Provider-neutral contract

`apps/api/src/messaging/messaging-contract.ts` defines:

- `WHATSAPP` and `MESSENGER` channel identities;
- provider-scoped customer identity that is explicitly separate from canonical `Customer` identity;
- inbound message/event envelopes with provider event/message IDs;
- optional first-message/referral attribution as provenance only;
- channel-neutral conversation phase/state;
- outbound commands with explicit idempotency and causation metadata.

The contract carries structured facts but does not make them authoritative. Every business domain must validate its own input before any action is committed.

## Canonical Quote questionnaire reuse

Messaging is a conversational presentation of the existing Quote capture flow, not a new Quote questionnaire.

The live Website currently presents eight Quote sections in this order:

1. Your Home
2. Cleaning Requirements
3. Personalise Your Service
4. Preferred Visit
5. Access and Household Details
6. Photos and Notes
7. Your Details
8. Review and Submit

`apps/api/src/messaging/messaging-quote-draft.ts` reuses the structured business-fact groups from `WebsiteQuoteSubmissionV2`:

- `customer`
- `property`
- `request`
- `visit`
- `access`
- `household`
- `safety`
- `notes`
- `photos`

This reuse is deliberately limited to Quote facts and validation semantics. Messaging does **not** reuse the Website transport envelope, `HESTIVA_WEBSITE` provenance, Website submission identity, Website bearer secret, or Website ingestion route.

The conversation engine may ask questions in a more natural order when the customer volunteers information early, but before requesting a consequential Quote-domain action it must resolve and validate the same canonical facts required by the current HestivaOS Quote contract. Conditional Website rules remain the starting point rather than being independently recreated for messaging. This includes property-layout rules, service/frequency compatibility, add-ons, current structured Laundry/Ironing quantities/facilities, visit/access/household/safety details, customer contact details and Quote evidence.

When Website or HestivaOS Quote semantics change, messaging should first evaluate and inherit the canonical change rather than maintain an independently drifting copy.

## Provider adapter boundary

`MessagingProviderAdapter` is the provider-specific edge. An implementation must:

1. verify webhook authenticity using the provider-supported mechanism;
2. fail closed when authenticity cannot be established;
3. normalize one webhook into zero, one, or many provider-neutral events;
4. submit only already-authorized outbound commands;
5. keep provider payload details out of business-domain logic.

No Meta adapter is implemented in Foundation v1. Graph API versions, permissions, webhook signature rules, app review, templates, South African pricing, and onboarding remain provider-runtime work and must be reverified against current Meta documentation before implementation.

## Replay and idempotency

`buildMessagingProviderEventKey()` creates a deterministic SHA-256 key from:

- channel;
- normalized provider name;
- provider event ID.

The key contains no Customer/phone identity and does not expose the raw provider event ID. The provider event ID remains the upstream replay identity; the generated key is the intended durable deduplication identity for later persistence.

Future persistence must enforce provider-event uniqueness at the database boundary before a webhook can cause a Quote, booking, notification, or other consequential action. Network retries and uncertain send outcomes must be recovered by read/reconciliation rather than blind duplicate mutation.

## Attribution and provenance

Provider referral/click information may be stored when supplied by the provider, including source/ad/click identifiers and creative context. It is provenance, not business truth.

First-message attribution must be captured at the first trustworthy inbound event because later provider events may not repeat it. No campaign or source field may be fabricated when Meta does not supply it.

## Customer identity boundary

A WhatsApp or Messenger identity is not a HestivaOS `Customer`.

Later identity resolution may link one provider identity to one canonical Customer only through an approved deterministic rule. No name-only or fuzzy cross-channel merge is permitted. The existing Quote Customer/Property match-or-review rules remain authoritative where applicable.

## Quote-domain boundary

Messaging must not submit to the website-specific integration as if it were the website. In particular it must not:

- call the website ingestion controller as a messaging transport;
- claim `HESTIVA_WEBSITE` provenance;
- reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`;
- copy website-only transport semantics into the shared conversation engine.

Before live quote submission is added, the Quote domain should expose or extract an internal application-service boundary that accepts the canonical structured Quote facts from trusted HestivaOS code while retaining the existing Quote domain as the single authority for validation, pricing, immutable revision creation, idempotency, and review state. The existing Website integration remains one adapter/consumer of Quote-domain behavior rather than the contract that messaging impersonates.

The exact internal Quote application-service interface is deliberately deferred from Foundation v1 so this slice does not create a second messaging-only Quote schema before the current Quote implementation is refactored safely.

## Retention inherited from the public Privacy Policy

Messaging does not create a separate arbitrary chat-retention schedule. It inherits the currently published Homent privacy lifecycle:

- general or unsuccessful enquiries are normally retained for up to **12 months**;
- quotation, customer and service communications are normally retained for up to **3 years after the last interaction or service**;
- financial, tax and other legally required records follow the applicable statutory period;
- temporary property-access information is deleted as soon as reasonably possible after it is no longer needed;
- technical/security logs are retained only as reasonably necessary for operational/security purposes, subject also to provider retention where applicable;
- when information is no longer required it is deleted, destroyed or de-identified where appropriate.

For messaging persistence, an abandoned/general conversation therefore belongs to the enquiry lifecycle unless it becomes part of a Quote/customer/service record. Once it becomes quotation/customer/service communication, the corresponding three-year lifecycle applies from the last interaction or service. This classification must remain explicit enough for later cleanup jobs to apply the correct retention class.

Provider platform copies of messages may have their own retention behavior; HestivaOS must not claim deletion from Meta when it has only deleted its own stored copy.

## Persistence boundary

Foundation v1 still does not add Prisma models or migrations. The retention duration itself is now resolved by inheritance from the existing Homent Privacy Policy. Remaining persistence decisions that must be resolved before schema is frozen include:

- raw provider payload retention versus normalized-only storage;
- exact PII/redaction implementation;
- media metadata/object ownership and cleanup;
- immutable message/provenance requirements;
- conversation-state update/concurrency rules;
- canonical Customer/Quote link semantics;
- how retention class and retention anchor timestamps are represented so the existing policy can be enforced safely.

These are messaging implementation details that the Website/OS do not fully decide for provider chat transcripts; they should be solved narrowly without changing the existing customer-data or Quote model unnecessarily.

## AI boundary

No AI provider or model is part of Foundation v1. Later AI may interpret free text and produce proposed structured facts, but those facts must pass deterministic HestivaOS validation. AI may never invent or authorize prices, discounts, availability, payment state, booking state, Customer identity, or job status.

## Human escalation

`HUMAN_REVIEW` is a first-class provider-neutral conversation phase. The exact operator inbox/takeover UX remains deferred. Provider adapters and the eventual conversation engine must be able to yield rather than force ambiguous or unsupported requests through automation.

## Next slice

Resolve the remaining provider-transcript persistence details in Issue #116, then add durable Conversation/Channel Identity/Message/Attribution/State storage with database-enforced provider-event idempotency and the inherited retention classification. After that foundation is verified, add the first authenticated WhatsApp Cloud API webhook adapter without AI or customer-facing quote automation.
