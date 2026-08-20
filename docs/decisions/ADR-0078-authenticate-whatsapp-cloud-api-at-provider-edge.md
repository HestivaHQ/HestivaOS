# ADR-0078 — Authenticate WhatsApp Cloud API at the provider edge

Status: Proposed; becomes accepted when the implementing PR merges.

Date: 2026-08-20

## Context

Messaging Foundation v1 already requires provider adapters to authenticate inbound events before normalization and persistence, keeps complete raw provider payloads out of durable messaging history, and keeps provider transport separate from HestivaOS business authority.

The first live provider runtime is direct Meta WhatsApp Business Platform / Cloud API. Meta webhook subscription verification uses the configured verify token and challenge. POST webhook authenticity is established from the `X-Hub-Signature-256` HMAC-SHA256 signature over the exact raw request body using the Meta app secret. Normalized message events then enter the existing database-enforced provider-event idempotency boundary.

## Decision

HestivaOS will expose a public provider-authenticated WhatsApp webhook at `/api/v1/messaging/webhooks/whatsapp`.

- GET subscription verification succeeds only for `hub.mode=subscribe`, an exact configured verify-token match, and a supplied challenge.
- POST processing requires the exact raw HTTP request bytes and a valid `X-Hub-Signature-256` computed with `META_APP_SECRET`; missing configuration, missing raw bytes, malformed signatures and mismatches fail closed before normalization or persistence.
- Complete raw webhook JSON remains transport input only and is not written into normal messaging history.
- The adapter normalizes inbound WhatsApp message events into the existing provider-neutral messaging contract and `MessagingService.persistInbound()` remains the durable idempotent persistence boundary.
- The provider name is `meta` and the channel is `WHATSAPP`. WhatsApp identities remain provider-scoped and do not become canonical Customer identities merely because a message was received.
- Referral/click metadata supplied with a message is preserved as provenance without becoming business truth.
- Text outbound delivery uses the configured Graph API version, WhatsApp business phone-number ID and access token. The adapter is registered as an available outbound transport only when all outbound configuration is present.
- The Graph API version is explicit deployment configuration rather than a hard-coded repository default so upgrades remain deliberate and reviewable.
- This slice does not activate production credentials, implement AI, create Quotes from messages, add fuzzy Customer matching, or implement Messenger.

## Security consequences

The Nest API retains raw request bytes so provider signatures can be verified correctly. Application code must not log or persist those raw bytes. Provider access tokens, app secrets and webhook verify tokens are API-only secrets and must never be exposed to the browser or committed.

The public webhook bypasses Supabase user authentication only because provider authenticity is its authentication boundary. A successful public HTTP request is not trusted unless provider verification succeeds.

## Operational consequences

Production activation requires a Meta business portfolio, WhatsApp Business Account and registered business phone number, plus approved runtime credentials/permissions. The deployment must set the environment-variable names documented in `docs/ENVIRONMENT.md` before Meta webhook subscription or outbound delivery is enabled.

Provider status-webhook processing, richer outbound message kinds and Messenger runtime remain later bounded extensions of the same adapter contract.
