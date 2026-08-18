# Messaging Foundation v1 architecture merge note

This temporary merge-reconciliation note exists only because the GitHub connector available to the messaging chat cannot safely append to the large existing `docs/ARCHITECTURE.md` without replacing the entire file from truncated content.

Before PR #119 is marked ready or merged, fold the verified content below into `docs/ARCHITECTURE.md` and delete this temporary note.

## Provider-neutral messaging foundation (2026-08-18)

HestivaOS defines a provider-neutral messaging contract for future WhatsApp and Facebook Messenger integrations. Provider adapters own provider authenticity verification, raw-provider normalization and outbound transport only. They do not own or decide Customer identity, pricing, availability, Quote state, booking state, payment state, Work Orders, recurring services or job execution.

Provider-scoped messaging identities remain separate from canonical HestivaOS `Customer` identity. The normalized inbound envelope preserves the provider/channel facts Homent needs. Complete raw Meta webhook payloads are not retained after verification and normalization. A deterministic SHA-256 provider-event key based on channel, normalized provider name and provider event ID defines the durable replay/deduplication identity without including Customer or phone identity.

Persisted inbound/outbound message content and provenance are immutable. Later customer corrections, replies and provider delivery/read/failure information are represented as new messages/events while current conversation and Quote-draft state may advance separately.

Messaging inherits the Website/HestivaOS Quote questionnaire and privacy-retention rules. General/unsuccessful enquiries use the existing up-to-12-month lifecycle; quotation/customer/service communications use the existing up-to-three-years-after-last-interaction-or-service lifecycle. Temporary access information is removed when no longer needed.

Messaging uses a resumable Quote draft while answers are being collected. The canonical HestivaOS Quote is created only after all required canonical facts are complete and the customer explicitly confirms a concise review summary. A submitted Quote change becomes a new immutable revision of the same Quote.

Messaging does not create operational Customers at first contact. Provider identity may support deterministic Customer matching under existing HestivaOS rules, but name-only/fuzzy matching is forbidden and ambiguous/conflicting identity requires review. New Customer creation follows the accepted-Quote conversion flow.

Quote-related customer media ultimately uses the existing QuotePhoto ownership model. Messaging may hold only temporary provider media references during enquiry/draft handling and does not create a second permanent media library.

Unsupported, ambiguous, manually-priced or otherwise unsafe Quote requests enter human review. HestivaOS must surface an operator attention/notification signal. While review is active, Quote-specific automation pauses, but unrelated customer questions and unrelated information updates may continue. Quote questions receive a review-status response until a representative or deliberate hand-back resumes Quote automation.

The Website Quote ingestion boundary remains website-specific. Messaging must not impersonate `HESTIVA_WEBSITE`, call the website ingestion controller as its generic transport or reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`. A later Quote application-service boundary must let messaging and website adapters converge on the existing authoritative Quote validation/pricing/revision/idempotency domain without creating a second pricing or Quote system.

The approved next implementation slice is durable Conversation/Channel Identity/Message/Attribution/State/Quote Draft persistence with database-enforced provider-event idempotency, retention classification, safe Customer/Quote links and a human-review attention integration point. Live Meta webhooks, provider credentials, AI and customer-facing automation remain out of scope for this persistence slice.

See `docs/MESSAGING_FOUNDATION_V1.md`, ADR-0048 through ADR-0052, and Issue #116.
