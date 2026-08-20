# ADR-0082: Messenger outbound uses standard-window replies and fail-closed unknown outcomes

## Status

Accepted — 2026-08-20.

## Context

HestivaOS already has a receive-only Meta Messenger edge and a provider-neutral outbound delivery state machine. Meta's Messenger Send API requires a Page access token with `pages_messaging`, and ordinary replies are permitted only when the recipient has messaged the Page within the standard 24-hour messaging window unless a separately approved out-of-window mechanism applies.

Messenger does not provide the same HestivaOS callback-correlation mechanism used by the current WhatsApp adapter to reconcile an ambiguous send response. Retrying after a network failure or provider 5xx could therefore duplicate a customer message if Meta accepted the original request but the response was lost.

## Decision

1. Messenger outbound v1 supports non-empty TEXT replies only.
2. HestivaOS sends them with `messaging_type=RESPONSE` and requires a durable inbound message in the same conversation within the preceding 24 hours before any provider call.
3. Conversations outside that window are not advertised as currently available outbound channels.
4. Messenger outbound registers only when `META_MESSENGER_PAGE_ACCESS_TOKEN`, `META_MESSENGER_PAGE_ID`, and `META_GRAPH_API_VERSION` are configured.
5. Network failures, provider 5xx responses, and malformed successful responses are classified as unknown outcomes. The existing generic messaging state records a second `PENDING` marker and blocks another provider call for the same durable idempotency key.
6. Explicit non-5xx provider rejection is recorded as `FAILED` and may be retried through the existing same-message flow.
7. No Messenger message tags, sponsored messaging, out-of-window service messages, marketing sends, or autonomous sends are enabled by this decision.

## Consequences

Messenger can be used for safe customer-response workflows such as human-triggered access recovery while the customer's standard reply window is open. A lost provider response can leave a message permanently pending until an operator or future reconciliation capability resolves it; this is intentionally safer than duplicate customer messaging.

Future out-of-window Messenger capabilities require a separate current-policy review and explicit product approval. They must not weaken this ADR by silently treating a tag or alternative send type as equivalent to a standard reply.
