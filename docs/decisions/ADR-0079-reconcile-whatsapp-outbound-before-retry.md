# ADR-0079 — Reconcile WhatsApp outbound before retry

Status: Proposed; becomes accepted when the implementing PR merges.

Date: 2026-08-20

## Context

ADR-0078 intentionally left WhatsApp outbound disabled because a network or provider timeout can be ambiguous: Meta may have accepted a message even when HestivaOS does not receive the HTTP response. Blindly retrying that attempt could therefore send the same customer message twice.

WhatsApp Cloud API supports `biz_opaque_callback_data` on outbound messages and returns that business-supplied correlation string in subsequent message-status webhooks. HestivaOS already owns a durable unique outbound `idempotencyKey` and append-only message-status history.

## Decision

HestivaOS may enable WhatsApp text outbound only when all of these rules are enforced:

- Every provider send includes the durable HestivaOS outbound `idempotencyKey` as `biz_opaque_callback_data`.
- A successful HTTP response records the returned provider message ID as `ACCEPTED`.
- A definite client-side provider rejection may record `FAILED` and permit the existing same-request retry path.
- A network failure, provider 5xx response, malformed success response, or other ambiguous outcome does **not** become `FAILED`. HestivaOS appends a second `PENDING` status marker and blocks another provider call for that same idempotency key.
- Authenticated WhatsApp status webhooks use `biz_opaque_callback_data` to locate the durable local outbound message. `sent`, `delivered`, and `read` are positive provider evidence and currently reconcile to HestivaOS `ACCEPTED`; `failed` reconciles to `FAILED`.
- Status webhook replay is handled idempotently at the message/status boundary. A positive reconciliation can recover an access-recovery request to `SENT`; a failed reconciliation can move it to `SEND_FAILED` and allow deliberate same-request retry.
- If no provider status ever arrives after an ambiguous outcome, HestivaOS remains fail-closed and does not automatically resend.

## Consequences

This prioritizes duplicate prevention over automatic liveness. Operators may need to investigate an indefinitely unresolved provider outcome rather than resend blindly.

The existing schema is sufficient for this first reconciliation boundary. It deliberately collapses provider `sent` / `delivered` / `read` into the existing positive `ACCEPTED` state; distinct durable delivery/read analytics can be added later without weakening this retry rule.

The Website integration secret remains unrelated and is not reused. Provider secrets remain API-only deployment configuration.
