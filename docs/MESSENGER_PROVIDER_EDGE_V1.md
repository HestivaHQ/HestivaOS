# Messenger Provider Edge v1

## Status

This document records the first live Facebook Messenger provider slice for the canonical HestivaOS messaging foundation. Coordination source: `HestivaHQ/HestivaOS#116`.

## Runtime boundary

The public webhook route is `/api/v1/messaging/webhooks/messenger`.

GET subscription verification requires Meta's `hub.mode=subscribe`, the configured `META_MESSENGER_WEBHOOK_VERIFY_TOKEN`, and returns only the provider challenge when the token matches.

POST delivery bypasses Supabase user authentication because Meta provider authentication is the edge boundary. HestivaOS requires the exact raw request bytes and validates `X-Hub-Signature-256` with the existing API-only `META_APP_SECRET`. Missing raw bytes, missing configuration, malformed signatures, or invalid HMAC fail closed before normalization or persistence.

Authenticated Page webhook messaging events normalize into the existing provider-neutral contract with `channel=MESSENGER` and `provider=meta`. The Page-scoped sender ID remains only a provider identity; it is never treated as a canonical Customer ID. Text messages, postbacks, referral provenance, and bounded attachment metadata reuse the existing immutable conversation/message/status persistence and provider-event idempotency boundary.

## Receive-only activation

This v1 slice is intentionally receive-only. `MessengerPlatformAdapter.send()` fails closed and the adapter is not registered as an available outbound transport. This prevents HestivaOS from presenting Messenger as a send-capable channel before a safe retry/reconciliation strategy is approved.

The reason is transport safety: a network failure after Meta accepts a Messenger Send API request can leave HestivaOS without the provider message ID. Unlike the current WhatsApp implementation, this slice has no approved provider callback correlation field that lets HestivaOS prove that an ambiguous send already succeeded. Blind retry could therefore duplicate a customer message.

Outbound Messenger activation requires a separate reviewed slice covering Page access-token/permission configuration, applicable messaging-window policy, provider response/reconciliation behavior, and duplicate-safe retry semantics.

## Configuration

This slice reuses `META_APP_SECRET` and adds one API-only value:

- `META_MESSENGER_WEBHOOK_VERIFY_TOKEN` — private random value configured identically in the Meta Page webhook subscription and Railway API runtime.

Do not reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`. No Page access token is required by this receive-only slice.

## Explicit non-goals

No Messenger outbound sending, Page-token storage, delivery/read status reconciliation, attachment download/storage, Customer auto-linking, deterministic Quote flow, human takeover, AI behavior, or business-policy decision is introduced here.
