# Messenger Provider Edge v1

## Status

This document records the first live Facebook Messenger provider runtime for the canonical HestivaOS messaging foundation. Coordination source: `HestivaHQ/HestivaOS#116`.

## Runtime boundary

The public webhook route is `/api/v1/messaging/webhooks/messenger`.

GET subscription verification requires Meta's `hub.mode=subscribe`, the configured `META_MESSENGER_WEBHOOK_VERIFY_TOKEN`, and returns only the provider challenge when the token matches.

POST delivery bypasses Supabase user authentication because Meta provider authentication is the edge boundary. HestivaOS requires the exact raw request bytes and validates `X-Hub-Signature-256` with the existing API-only `META_APP_SECRET`. Missing raw bytes, missing configuration, malformed signatures, or invalid HMAC fail closed before normalization or persistence.

Authenticated Page webhook messaging events normalize into the existing provider-neutral contract with `channel=MESSENGER` and `provider=meta`. The Page-scoped sender ID remains only a provider identity; it is never treated as a canonical Customer ID. Text messages, postbacks, referral provenance, and bounded attachment metadata reuse the existing immutable conversation/message/status persistence and provider-event idempotency boundary.

## Guarded outbound activation

Messenger outbound v1 supports **standard-window TEXT replies only**. The adapter registers as an available outbound transport only when all of these API-only values are configured:

- `META_MESSENGER_PAGE_ACCESS_TOKEN`
- `META_MESSENGER_PAGE_ID`
- `META_GRAPH_API_VERSION`

The configured Page/app must have the Meta permissions/access required for Messenger customer messaging, including `pages_messaging`. HestivaOS does not infer that platform approval from the presence of a token.

Before any provider call, the shared messaging service requires a durable inbound message in the same Messenger conversation within the preceding 24 hours. If the latest customer message is older, the conversation is not advertised as an available outbound channel and a direct send attempt fails before reaching Meta. The Send API request uses `messaging_type=RESPONSE`.

No message tags, sponsored messages, out-of-window service sends, marketing sends, or other policy exceptions are enabled in v1.

## Duplicate-send safety

Messenger does not currently provide the HestivaOS callback-correlation field used by the WhatsApp adapter. A network failure after Meta accepts a request can therefore leave the local system without the provider message ID.

HestivaOS handles that state conservatively. Network failures, provider 5xx responses, and malformed successful responses are classified as an unknown outcome. The existing durable messaging state appends the ambiguity marker and blocks another provider call for that same idempotency key. It does **not** blindly resend.

Explicit non-5xx provider rejection is recorded as a normal failed attempt and may follow the existing same-message retry path. See ADR-0082.

## Configuration

Inbound verification uses:

- `META_APP_SECRET`
- `META_MESSENGER_WEBHOOK_VERIFY_TOKEN`

Outbound additionally uses:

- `META_MESSENGER_PAGE_ACCESS_TOKEN`
- `META_MESSENGER_PAGE_ID`
- `META_GRAPH_API_VERSION`

Do not reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`. Provider tokens are Railway/API-only and must never be committed or exposed to browser code.

## Explicit non-goals

No Messenger out-of-window messaging, message-tag policy, media outbound, delivery/read reconciliation, attachment download/storage, Customer auto-linking, deterministic Quote flow, human takeover, AI behavior, Finance, or Website behavior is introduced here.
