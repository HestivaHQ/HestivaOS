# Messaging Foundation v1 architecture merge note

This temporary merge-reconciliation note exists only because the GitHub connector available to the messaging chat cannot safely append to the large existing `docs/ARCHITECTURE.md` without replacing the entire file from truncated content.

Before PR #119 is marked ready or merged, fold the verified content below into `docs/ARCHITECTURE.md` and delete this temporary note.

## Provider-neutral messaging foundation (2026-08-18)

HestivaOS defines a provider-neutral messaging contract for future WhatsApp and Facebook Messenger integrations. Provider adapters own provider authenticity verification, raw-provider normalization, and outbound transport only. They do not own or decide Customer identity, pricing, availability, Quote state, booking state, payment state, Work Orders, recurring services, or job execution.

Provider-scoped messaging identities remain separate from canonical HestivaOS `Customer` identity. The normalized inbound envelope preserves channel, provider event/message/conversation IDs, timestamps, message kind, structured interaction/media references, and optional provider referral/click attribution as provenance. A deterministic SHA-256 provider-event key based on channel, normalized provider name, and provider event ID defines the future replay/deduplication identity without including Customer or phone identity.

The Website Quote ingestion boundary remains website-specific. Messaging must not impersonate `HESTIVA_WEBSITE`, call the website ingestion controller as its generic transport, or reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`. A later slice must expose or extract an internal HestivaOS Quote application-service boundary so messaging and website adapters converge on the existing authoritative Quote validation/pricing/revision/idempotency domain without creating a second pricing or Quote system.

Foundation v1 is contract-only: it adds no live provider webhook, Meta credential/API call, Prisma messaging model, migration, AI provider, or customer-facing automation. Conversation persistence is intentionally deferred until Issue #116 resolves message retention, raw-payload/PII/media policy, conversation-state concurrency, and canonical Customer/Quote linkage. See `docs/MESSAGING_FOUNDATION_V1.md` and ADR-0047.
