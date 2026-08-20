# Messaging Foundation v1

## Status

Messaging Foundation v1 establishes the channel-neutral contract and persistence direction for Homent customer messaging. The first provider-runtime extension now implements the authenticated WhatsApp Cloud API edge described below. AI, autonomous Quote creation, Messenger runtime, provider-identity Customer linking and broad customer-facing automation remain outside this foundation.

Coordination source: `HestivaHQ/HestivaOS#116`.

## Goals

The foundation keeps WhatsApp and Facebook Messenger as provider channels around one shared HestivaOS conversation boundary. HestivaOS remains authoritative for Customers, Properties, Quotes, pricing, Work Orders, recurring services, payments, and operational state.

The governing rule is **reuse before invention**: customer data, validation, retention, Quote lifecycle and operational decisions already established by the live Website and HestivaOS are inherited unless messaging introduces a genuine channel-specific gap.

## Provider-neutral contract

`apps/api/src/messaging/messaging-contract.ts` defines:

- `WHATSAPP` and `MESSENGER` channel identities;
- provider-scoped customer identity separate from canonical `Customer` identity;
- inbound message/event envelopes with provider event/message IDs;
- optional first-message/referral attribution as provenance only;
- channel-neutral conversation phase/state;
- outbound commands with explicit idempotency and causation metadata.

The contract carries facts but does not make them authoritative. Every business domain validates its own input before consequential action.

## Canonical Quote questionnaire reuse

Messaging is a conversational presentation of the existing Quote capture flow, not a new questionnaire.

The Website currently presents eight Quote sections:

1. Your Home
2. Cleaning Requirements
3. Personalise Your Service
4. Preferred Visit
5. Access and Household Details
6. Photos and Notes
7. Your Details
8. Review and Submit

`apps/api/src/messaging/messaging-quote-draft.ts` reuses the structured business-fact groups from `WebsiteQuoteSubmissionV2`: `customer`, `property`, `request`, `visit`, `access`, `household`, `safety`, `notes`, and `photos`.

Messaging does **not** reuse the Website transport envelope, `HESTIVA_WEBSITE` provenance, Website submission identity, Website bearer secret, or Website ingestion route.

The conversation may ask questions in a more natural order when the customer volunteers information early, but the same required canonical facts and conditional rules must be resolved before Quote submission.

## Provider adapter boundary

`MessagingProviderAdapter` is the provider-specific edge. An implementation must:

1. verify webhook authenticity using the provider-supported mechanism;
2. fail closed when authenticity cannot be established;
3. normalize one webhook into zero, one, or many provider-neutral events;
4. submit only already-authorized outbound commands;
5. keep provider payload details out of business-domain logic.

The contract now carries optional exact raw request bytes solely so providers whose signatures cover the original HTTP body can authenticate before normalization. Those bytes are transport input and are not normal durable messaging data.

## WhatsApp Cloud API provider runtime v1

The first provider-specific runtime is direct Meta WhatsApp Business Platform / Cloud API. It is implemented behind the existing `MessagingProviderAdapter` boundary and remains inactive until deployment-owned Meta configuration is supplied.

- Public callback: `GET|POST /api/v1/messaging/webhooks/whatsapp`.
- GET subscription verification requires `hub.mode=subscribe`, exact `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` equality and a challenge value.
- POST authentication requires `X-Hub-Signature-256` HMAC-SHA256 verification over the exact raw request bytes with `META_APP_SECRET`. Missing raw bytes, missing configuration, malformed signatures and mismatches fail closed before persistence.
- Authenticated inbound WhatsApp messages normalize to provider `meta`, channel `WHATSAPP`, provider-scoped identity, immutable provider message/event identity, text/interactive/media facts and supplied referral/click provenance. `MessagingService.persistInbound()` remains the database idempotency and durable-history boundary.
- Complete raw Meta payloads are not persisted. Only the approved normalized fields enter HestivaOS messaging history.
- Text outbound commands use the explicitly configured Graph API version, WhatsApp phone-number ID and access token. The adapter advertises outbound availability through `MessagingAdapterRegistry` only when the outbound transport configuration is complete.
- Rich outbound message kinds and provider delivery/read/failure status-webhook persistence are later bounded extensions; this v1 transport does not pretend they are complete.

The Graph API version is intentionally an environment value rather than a repository default. Provider-version upgrades must therefore be deliberate and reverified instead of silently following a moving external default. See ADR-0078 and `docs/ENVIRONMENT.md`.

## Replay and idempotency

`buildMessagingProviderEventKey()` creates a deterministic SHA-256 key from channel, normalized provider name and provider event ID. The key contains no Customer/phone identity and is the intended durable deduplication identity.

Persistence must enforce provider-event uniqueness at the database boundary before a webhook can cause a Quote, booking, notification or other consequential action. Network retries and uncertain send outcomes are recovered by read/reconciliation rather than blind duplicate mutation.

## Provider data storage

HestivaOS stores **normalized messaging data only**. Complete raw Meta webhook payloads are not retained after verification and normalization.

Persist only the provider/channel facts Homent needs, including provider event/message IDs, timestamps, normalized message content/type, channel identity, relevant status information and supplied attribution/provenance. If a future provider field becomes necessary, add it deliberately to the normalized contract.

## Immutable messaging history

Persisted inbound and outbound message content and provenance are immutable after creation. Customer corrections, staff replies, delivery/read/failure states and later provider events are new records/events rather than edits to historical message content.

Current conversation state and current Quote-draft facts may change, but historical messages remain a trustworthy record of what was actually sent and received.

## Attribution and provenance

Provider referral/click information may be stored when supplied, including source/ad/click identifiers and creative context. It is provenance, not business truth.

First-message attribution must be captured at the first trustworthy inbound event because later provider events may not repeat it. No campaign/source field may be fabricated.

## Retention

Messaging inherits the published Homent privacy lifecycle:

- general or unsuccessful enquiries: normally up to **12 months**;
- quotation, customer and service communications: normally up to **3 years after the last interaction or service**;
- legally required financial/tax records: applicable statutory period;
- temporary property-access information: delete as soon as reasonably possible after no longer needed;
- technical/security logs: only as reasonably necessary.

An abandoned/general conversation belongs to the enquiry lifecycle unless it becomes part of a Quote/customer/service record. Retention class and anchor timestamps must be explicit enough for cleanup jobs to enforce the policy safely.

Provider platform copies may have their own retention behavior; HestivaOS must not claim deletion from Meta when it has only deleted its own copy.

## Quote-related media

Messaging does not create a second permanent media library.

While a conversation is still an enquiry, messaging may retain only temporary provider media references/metadata needed to continue processing. Once a customer image becomes Quote evidence, it moves into the existing Quote-owned photo workflow. Later Work Orders reference the applicable Quote assets rather than receiving duplicate copies.

## Customer identity and creation

Provider/channel identity is not a canonical HestivaOS `Customer`.

WhatsApp mobile identity may be used as a deterministic matching input where it safely fits the existing HestivaOS Customer matching rules. Name-only or fuzzy cross-channel matching is not permitted. Ambiguous or conflicting matches require review.

A messaging lead does not immediately create an operational Customer. A conversation may remain an enquiry and complete a Quote without creating a Customer record. New Customer creation follows the existing accepted-Quote conversion flow.

## Messaging Quote draft and submission

While Quote questions are still being answered, messaging stores a resumable **Messaging Quote Draft**. It continuously preserves collected canonical facts so the customer can continue later.

A canonical HestivaOS Quote is created only when:

1. all required canonical Quote facts are complete and valid; and
2. the customer has seen a concise review summary and explicitly confirmed submission.

This is the conversational equivalent of the Website `Review and Submit` step. Abandoned conversations remain enquiries rather than incomplete canonical Quotes.

## Submitted Quote changes

If the customer changes a submitted Quote, messaging uses the existing immutable Quote revision model. The same Quote receives a new revision; prior revisions are not overwritten and a second Quote is not created merely because the customer changed a detail.

## Human review

Unsupported, ambiguous, manually-priced, or otherwise unsafe Quote requests enter `HUMAN_REVIEW` instead of the assistant guessing.

HestivaOS must surface an operator attention/notification signal for conversations requiring review. The exact notification UI or delivery mechanism is deferred to the relevant OS implementation slice.

Human review pauses **Quote-specific automated decisions and replies only**. The assistant may continue answering unrelated questions and updating unrelated information. If the customer asks about the Quote while review is active, the assistant explains that the Quote is being reviewed and that a representative will assist shortly.

Quote automation resumes only after the conversation is deliberately handed back to automation.

## Quote-domain boundary

Messaging must not submit to the Website integration as if it were the Website and must not claim `HESTIVA_WEBSITE` provenance or reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`.

Before live Quote submission is added, the Quote domain should expose or extract an internal application-service boundary that accepts canonical structured Quote facts from trusted HestivaOS code while retaining the existing Quote domain as the single authority for validation, pricing, immutable revision creation, idempotency and review state.

## AI boundary

No AI provider or model is part of Foundation v1. Later AI may interpret free text and propose structured facts, but those facts must pass deterministic HestivaOS validation. AI may never invent or authorize prices, discounts, availability, payment state, booking state, Customer identity or job status.

## Persistence foundation status

Durable channel-neutral `MessagingConversation`, `MessagingMessage` and message-status-event persistence now exists, including the bounded Work Order access-recovery extension described below. Provider-event idempotency and immutable message history remain authoritative.

The next provider-runtime residual after WhatsApp Cloud API v1 is provider delivery/read/failure status ingestion and richer outbound transport, followed by Messenger behind the same provider-neutral boundary. Customer-linking and deterministic Quote/service automation remain separate product slices.

## 2026-08-19 Phase 3D access-recovery extension

Canonical conversations and immutable inbound/outbound message records now support the bounded `WORK_ORDER_ACCESS_RECOVERY` purpose and visit-scoped correlation described in `WORK_ORDER_ACCESS_RECOVERY_V1.md`. An ADMIN explicitly selects an available configured Customer-linked conversation; provider identity is not Customer identity. Stable database/provider idempotency identities protect retries. Normalized inbound responses remain original messaging records and are only surfaced for review; no message is interpreted or accepted automatically. Provider adapters still own authenticity, normalization, private media securing, and transport only. This is not a general inbox or autonomous correspondence system.
