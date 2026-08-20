# ADR-0078 — Authenticate WhatsApp Cloud API at the provider edge

Status: Proposed; becomes accepted when the implementing PR merges.

Date: 2026-08-20

## Context

Messaging Foundation v1 already requires provider adapters to authenticate inbound events before normalization and persistence, keeps complete raw provider payloads out of durable messaging history, and keeps provider transport separate from HestivaOS business authority.

The first live provider runtime is direct Meta WhatsApp Business Platform / Cloud API. Meta webhook subscription verification uses the configured verify token and challenge. POST webhook authenticity is established from the `X-Hub-Signature-256` HMAC-SHA256 signature over the exact raw request body using the Meta app secret. Normalized message events then enter the existing database-enforced provider-event idempotency boundary.

The existing outbound access-recovery path retries a locally failed send using the same request identity. For a provider/network timeout, HestivaOS cannot currently prove whether Meta accepted the original send. Blindly retrying that ambiguous outcome could therefore duplicate a customer message. No proven provider-side idempotency/reconciliation boundary is established in this slice.

## Decision

HestivaOS will expose a public provider-authenticated WhatsApp webhook at `/api/v1/messaging/webhooks/whatsapp` and will keep WhatsApp outbound transport disabled until ambiguous provider outcomes can be reconciled safely.

- GET subscription verification succeeds only for `hub.mode=subscribe`, an exact configured verify-token match, and a supplied challenge.
- POST processing requires the exact raw HTTP request bytes and a valid `X-Hub-Signature-256` computed with `META_APP_SECRET`; missing configuration, missing raw bytes, malformed signatures and mismatches fail closed before normalization or persistence.
- Complete raw webhook JSON remains transport input only and is not written into normal messaging history.
- The adapter normalizes inbound WhatsApp message events into the existing provider-neutral messaging contract and `MessagingService.persistInbound()` remains the durable idempotent persistence boundary.
- The provider name is `meta` and the channel is `WHATSAPP`. WhatsApp identities remain provider-scoped and do not become canonical Customer identities merely because a message was received.
- Referral/click and interactive metadata supplied with a message are preserved as provider provenance without becoming business truth. Media-only messages retain the historical media-array JSON shape; messages requiring extra provider provenance use a bounded metadata envelope in the existing JSON field.
- The WhatsApp adapter is not registered in `MessagingAdapterRegistry` as an outbound transport in this slice. Its `send()` path fails closed even if future send credentials happen to be present.
- A later outbound slice must define provider-status ingestion and a safe retry/reconciliation rule before customer sends are enabled.
- This slice does not activate production credentials, implement AI, create Quotes from messages, add fuzzy Customer matching, or implement Messenger.

## Security consequences

The Nest API retains raw request bytes so provider signatures can be verified correctly. Application code must not log or persist those raw bytes. The Meta app secret and webhook verify token are API-only secrets and must never be exposed to the browser or committed.

The public webhook bypasses Supabase user authentication only because provider authenticity is its authentication boundary. A successful public HTTP request is not trusted unless provider verification succeeds.

Failing closed on outbound transport is also a customer-safety boundary: HestivaOS prefers an explicit unavailable-send state over a duplicate customer message after an ambiguous provider outcome.

## Operational consequences

Production inbound activation requires a Meta business portfolio, WhatsApp Business Account and registered business phone number, plus the webhook-authentication configuration documented in `docs/ENVIRONMENT.md`.

Operators must not treat WhatsApp as an available HestivaOS outbound channel after this slice. Safe outbound retry/reconciliation, provider delivery/read/failure status processing, richer outbound message kinds and Messenger runtime remain later bounded extensions of the same provider-neutral contract.
