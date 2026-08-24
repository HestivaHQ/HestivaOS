# Messaging Foundation v1

## Status

Messaging Foundation v1 establishes the channel-neutral contract and persistence direction for Homent customer messaging. Provider-runtime extensions implement authenticated direct Meta WhatsApp and Messenger edges, bounded safe outbound behavior, durable provider-specific status/media handling where approved, deliberate provider-conversation to canonical Customer linking, and deterministic guided Quote collection through the currently merged sections. AI, broad customer-facing automation and general operator inbox behavior remain outside this foundation.

WhatsApp Flow is **APPROVED / PLANNED** as the primary structured WhatsApp Quote intake presentation under ADR-0088. It is not implemented by this document update. The deterministic guided WhatsApp collector remains **IMPLEMENTED / FALLBACK**. Messenger guided Quote collection remains the **IMPLEMENTED** provider-appropriate conversational path. HestivaOS remains the sole Quote, validation, pricing and business authority.

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

Messaging reuses the existing Quote capture business facts; it does not create a new questionnaire contract.

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

ADR-0049 remains authoritative: all channel presentations must resolve the same required canonical facts and conditional rules before HestivaOS performs consequential Quote validation/pricing/submission. Presentation may differ by provider: WhatsApp Flow is planned as the primary structured WhatsApp UX, while deterministic guided conversation remains the WhatsApp fallback and Messenger path.

## WhatsApp Flow-first Quote direction

ADR-0088 approves, but does not yet implement, a versioned WhatsApp Flow as the primary WhatsApp Quote intake presentation.

The planned customer fallback direction is:

**WhatsApp Flow -> deterministic guided WhatsApp collector -> Website Quote form where appropriate -> human assistance.**

The Flow is presentation/transport only. HestivaOS remains the sole authority for canonical Quote validation, pricing, immutable Quote creation/revision and `HUMAN_REVIEW` outcomes. Conditional Flow presentation and concise in-Flow help improve UX only and never replace HestivaOS validation.

Flow definitions must be treated as versioned deployment artifacts. A future durable Flow session must remain bound to the exact provider Flow definition and HestivaOS mapping version with which it was launched. Deploying V2 must not silently reinterpret an in-flight V1 completion.

Unfinished Flow field progress is **not assumed to survive interruption**. Until an authenticated completion is received, HestivaOS must not claim knowledge of unsubmitted field values merely because a Flow was offered. Provider lifecycle facts are recorded only when they can be proved; static v1 must not fabricate `STARTED`, `VIEWED` or `ABANDONED` events.

While an unresolved Flow session exists, the customer may return to ordinary WhatsApp chat for automated or human assistance. Those ordinary messages remain normal conversation/help and must **not** be interpreted as answers to the deterministic guided collector. The guided collector becomes answer-active only after a deliberate fallback transition. If the client preserves the unfinished Flow locally the customer may resume it; otherwise the system must support a safe restart/fallback without duplicate Quote creation or conflicting active submission.

The Flow's own versioned Review/Submit completion is planned to be the explicit submission action for the Flow path. The existing text review summary plus exact `CONFIRM` remains the implemented authorization path for conversational guided collection. See ADR-0052 and ADR-0088.

## Provider adapter boundary

`MessagingProviderAdapter` is the provider-specific edge. An implementation must:

1. verify webhook authenticity using the provider-supported mechanism;
2. fail closed when authenticity cannot be established;
3. normalize one webhook into zero, one, or many provider-neutral events;
4. submit only already-authorized outbound commands when a provider-specific send boundary is proven safe;
5. keep provider payload details out of business-domain logic.

The contract now carries optional exact raw request bytes solely so providers whose signatures cover the original HTTP body can authenticate before normalization. Those bytes are transport input and are not normal durable messaging data.

## WhatsApp Cloud API provider runtime v1

The first provider-specific runtime is direct Meta WhatsApp Business Platform / Cloud API. It supports authenticated inbound webhook ingestion and bounded provider outbound behavior within the message kinds currently implemented.

- Public callback: `GET|POST /api/v1/messaging/webhooks/whatsapp`.
- GET subscription verification requires `hub.mode=subscribe`, exact `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` equality and a challenge value.
- POST authentication requires `X-Hub-Signature-256` HMAC-SHA256 verification over the exact raw request bytes with `META_APP_SECRET`. Missing raw bytes, missing configuration, malformed signatures and mismatches fail closed before persistence.
- Authenticated inbound WhatsApp messages normalize to provider `meta`, channel `WHATSAPP`, provider-scoped identity, immutable provider message/event identity, text/interactive/media facts and supplied referral/click provenance. `MessagingService.persistInbound()` remains the database idempotency and durable-history boundary.
- Complete raw Meta payloads are not persisted. Only approved normalized fields enter HestivaOS messaging history.
- Media-only messages preserve the existing media-array JSON shape. When provider referral or interactive provenance also exists, the same JSON field uses a small envelope so that provenance is not silently discarded.
- Every outbound text send includes the durable HestivaOS message `idempotencyKey` as Meta `biz_opaque_callback_data`. Meta returns that correlation value in later message-status webhooks, allowing HestivaOS to reconcile a send even if the original HTTP response was lost.
- A successful provider response records provider-neutral `ACCEPTED`. A definite provider rejection records provider-neutral `FAILED`. Network errors, provider 5xx responses and malformed success responses are treated as ambiguous: HestivaOS records a second `PENDING` marker and refuses to call the provider again for that same idempotency key until a status webhook resolves the outcome.
- Authenticated WhatsApp `sent`, `delivered`, `read`, and `failed` callbacks are preserved separately as append-only `MessagingProviderStatusEvent` history with the exact normalized provider status and provider occurrence timestamp. Replay is idempotent on provider, provider message ID, provider status and provider timestamp.
- Provider-specific status history does not replace the provider-neutral retry state. Any positive `sent`, `delivered`, or `read` callback also reconciles the generic message state to `ACCEPTED`; `failed` reconciles it to `FAILED`. Missing intermediate provider statuses are never fabricated.
- The existing Work Order access-recovery retry path remains safe against blind duplicate sends: an ambiguous outcome remains blocked; positive provider evidence moves the recovery to `SENT`; failed evidence moves it to `SEND_FAILED`, after which the deliberate same-request retry path may run again.
- If Meta never produces a resolving status after an ambiguous send, HestivaOS remains fail-closed and does not automatically resend.
- Rich Flow launch/completion handling remains planned under ADR-0088 rather than being implied by the current provider edge.

See ADR-0078, ADR-0079, ADR-0080 and `docs/ENVIRONMENT.md`.

## Replay and idempotency

`buildMessagingProviderEventKey()` creates a deterministic SHA-256 key from channel, normalized provider name and provider event ID. The key contains no Customer/phone identity and is the intended durable deduplication identity.

Persistence must enforce provider-event uniqueness at the database boundary before a webhook can cause a Quote, booking, notification or other consequential action. Network retries and uncertain send outcomes are recovered by read/reconciliation rather than blind duplicate mutation.

For outbound WhatsApp text delivery, the durable local `idempotencyKey` is also the provider callback correlation identity. Once a provider call has an ambiguous outcome, replay of the same local message is blocked until provider evidence resolves it.

Provider-status webhook replay is independently idempotent. The generic `MessagingMessageStatusEvent` history remains the provider-neutral retry/business state, while `MessagingProviderStatusEvent` preserves exact provider lifecycle evidence without changing that shared vocabulary.

The planned Flow path inherits the same exactly-once business-effect requirement: duplicate/retried provider completion delivery must converge on the same Flow session/submission identity and exactly one canonical Quote or `HUMAN_REVIEW` result.

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

An abandoned/general conversation belongs to the enquiry lifecycle unless it becomes part of a Quote/customer/service record. Retention class and anchor timestamps must be explicit enough for cleanup jobs to enforce the policy safely. The retention classification term `abandoned` here describes the Homent enquiry lifecycle, not a claim that Meta emitted a Flow-abandonment event.

Provider platform copies may have their own retention behavior; HestivaOS must not claim deletion from Meta when it has only deleted its own copy.

## Quote-related media

Messaging does not create a second permanent media library.

Authenticated ordinary inbound WhatsApp media follows ADR-0081's secured private-media lifecycle outside immutable message history. While a conversation is still an enquiry, messaging may retain only the provider/media state required for safe processing. Once a customer image becomes Quote evidence, canonical ownership belongs to the existing Quote photo workflow rather than a second permanent Messaging library.

WhatsApp Flow PhotoPicker is **PLANNED / OPTIONAL** under ADR-0088 and is independently disableable. PhotoPicker completion media is not treated as an ordinary inbound WhatsApp image merely because both originate from WhatsApp. Its provider-specific retrieval/decryption/verification lifecycle must be implemented and tested separately while preserving ADR-0081's private-storage, no-temporary-URL, replay-safety and immutable-history principles. PhotoPicker failure must not disable the core Quote Flow.

## Customer identity and creation

Provider/channel identity is not a canonical HestivaOS `Customer`.

WhatsApp mobile identity may be used as a deterministic matching input where it safely fits the existing HestivaOS Customer matching rules. Name-only or fuzzy cross-channel matching is not permitted. Ambiguous or conflicting matches require review.

The first explicit linking boundary uses the existing nullable `MessagingConversation.customerId` relation. An ADMIN may deliberately link an existing unlinked conversation to an existing canonical Customer through the guarded messaging Customer-link API. Selecting the same Customer again is idempotent. A conversation already linked to a different Customer fails with conflict; v1 does not silently unlink or reassign it. Provider identity, provider conversation identity and historical message records are never rewritten by the Customer link. See `MESSAGING_CUSTOMER_LINKING_V1.md` and ADR-0083.

A messaging lead does not immediately create an operational Customer. A conversation may remain an enquiry and complete a Quote without creating a Customer record. New Customer creation follows the existing accepted-Quote conversion flow.

The planned Flow path does not weaken this rule. Provider identity alone is insufficient authority to prefill or expose private canonical Customer/Property data.

## Messaging Quote draft and submission

The implemented deterministic guided collectors store a resumable **Messaging Quote Draft** while Quote questions are being answered. Guided WhatsApp and Messenger create a canonical HestivaOS Quote only when required canonical facts are complete/valid and the customer has seen the conversational review summary and explicitly confirmed submission.

This is the conversational equivalent of the Website `Review and Submit` step and remains the fallback/Messenger behavior. ADR-0088 supersedes only this presentation/confirmation mechanism for the planned WhatsApp Flow path: the Flow's own versioned Review/Submit completion will be the explicit submission action, followed by the same authoritative HestivaOS validation and Quote-domain boundary.

Abandoned/general conversations remain enquiries rather than incomplete canonical Quotes. No provider `ABANDONED` Flow event is inferred by that business classification.

## Submitted Quote changes

If the customer changes a submitted Quote, messaging uses the existing immutable Quote revision model. The same Quote receives a new revision; prior revisions are not overwritten and a second Quote is not created merely because the customer changed a detail.

## Human review

Unsupported, ambiguous, manually-priced, or otherwise unsafe Quote requests enter `HUMAN_REVIEW` instead of the assistant guessing.

HestivaOS must surface an operator attention/notification signal for conversations requiring review. The exact notification UI or delivery mechanism is deferred to the relevant OS implementation slice.

Human review pauses **Quote-specific automated decisions and replies only**. The assistant may continue answering unrelated questions and updating unrelated information. If the customer asks about the Quote while review is active, the assistant explains that the Quote is being reviewed and that a representative will assist shortly.

Quote automation resumes only after the conversation is deliberately handed back to automation.

## Quote-domain boundary

Messaging must not submit to the Website integration as if it were the Website and must not claim `HESTIVA_WEBSITE` provenance or reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`.

The shared internal Quote submission boundary is implemented and accepts canonical structured Quote facts from trusted HestivaOS Messaging code while retaining the existing Quote domain as the single authority for validation, pricing, immutable revision creation, idempotency and review state. The planned Flow path must reuse this boundary rather than create a Flow-owned Quote service.

## AI boundary

No AI provider or model is part of Foundation v1. Later AI may interpret free text and propose structured facts, but those facts must pass deterministic HestivaOS validation. AI may never invent or authorize prices, discounts, availability, payment state, booking state, Customer identity or job status.

ADR-0088 explicitly keeps the first production Flow simple: no AI, live pricing or unnecessary dynamic backend/data-exchange behavior merely because the provider supports it.

## Persistence foundation status

Durable channel-neutral `MessagingConversation`, `MessagingMessage` and generic message-status-event persistence exists, including the bounded Work Order access-recovery extension described below. WhatsApp also has separate append-only provider-status history for exact `sent`, `delivered`, `read`, and `failed` evidence, and approved ordinary inbound media is secured outside immutable message history. Provider-event idempotency and immutable message history remain authoritative.

Direct WhatsApp and Messenger provider edges are implemented within their current bounded policies. Deliberate provider-conversation to canonical Customer linking is implemented as a separate guarded extension. Deterministic guided Quote collection, review/confirmation, authoritative Messaging Quote submission and correction handling are implemented through the currently merged collector sections. WhatsApp Flow/session runtime, broad human takeover/operator handling and AI remain later Phase 3 slices.

## 2026-08-19 Phase 3D access-recovery extension

Canonical conversations and immutable inbound/outbound message records support the bounded `WORK_ORDER_ACCESS_RECOVERY` purpose and visit-scoped correlation described in `WORK_ORDER_ACCESS_RECOVERY_V1.md`. An ADMIN explicitly selects an available configured Customer-linked conversation; provider identity is not Customer identity. Stable database/provider idempotency identities protect retries. Normalized inbound responses remain original messaging records and are only surfaced for review; no message is interpreted or accepted automatically for access recovery. Provider adapters still own authenticity, normalization, private media securing, and transport only. This is not a general inbox or autonomous correspondence system.
