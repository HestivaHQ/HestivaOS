# Messaging Admin Reply v1

## Status

HestivaOS has a bounded ADMIN-only Messenger manual-reply surface. Coordination source: `HestivaHQ/HestivaOS#116`.

## API

ADMIN-only routes:

- `GET /api/v1/messaging/conversations`
- `POST /api/v1/messaging/conversations/:conversationId/manual-replies`

The POST body contains:

- `requestId`: caller-generated UUID used to derive the durable reply idempotency key;
- `text`: non-empty Messenger TEXT reply content.

## Web surface

`/admin/messaging` lists recent Messenger conversations, shows whether the standard reply window is currently open, and allows an ADMIN to send a manual reply when eligible. Management links to this page for ADMIN users.

## Safety and durability

- Messenger only in v1;
- ADMIN authorization is enforced at the API boundary and the page is hidden from non-ADMIN users;
- a conversation must already exist;
- a customer inbound message in the same conversation must exist within the preceding 24 hours before a new durable reply is created;
- `MessagingService.send()` rechecks the same 24-hour rule immediately before provider delivery;
- the durable message is created as `OUTBOUND`, `TEXT`, `GENERAL` with a `PENDING` status event before transport;
- same-request replay with the same conversation/text is idempotent;
- conflicting request-identity reuse fails closed;
- Meta delivery still occurs only through `MessengerPlatformAdapter` and retains ADR-0082 unknown-outcome blocking;
- no message tags, sponsored/out-of-window send, automated reply, Customer auto-linking or provider bypass is introduced.

A canonical Customer link is not required merely to answer an enquiry. Provider identity remains separate from Customer identity.

## Scope boundary

This surface proves and enables deliberate human Messenger replies. It is not yet a full shared inbox or human-takeover lifecycle: there is no operator assignment, conversation ownership, automation pause/hand-back state, unread workflow, richer Messenger media/status support, or deterministic Quote/service automation in this slice.

See ADR-0082, ADR-0083, ADR-0084 and `MESSAGING_FOUNDATION_V1.md`.
