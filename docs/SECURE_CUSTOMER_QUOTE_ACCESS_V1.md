# Secure Customer Quote Access V1

Status: **APPROVED ARCHITECTURE / NOT IMPLEMENTED** — 2026-08-24.

ADR-0089 is the durable decision authority. This document is the focused implementation contract/fixture guide for the future secure customer Quote access runtime. It does not claim that schema, routes, UI, email delivery or view tracking are implemented.

## Authority boundaries

- `Quote` + the exact immutable `QuoteRevision` remain authoritative for commercial state, stored pricing and lifecycle.
- Customer access is a bearer capability over a deliberately limited projection; it is not a customer account and does not prove legal identity.
- Public customer response endpoints must never expose/call ADMIN controllers directly.
- Existing canonical Quote acceptance/preflight/conversion and decline authority must be reused/refactored, not cloned.
- Correspondence remains authoritative for immutable rendered correspondence and provider-neutral email delivery attempts.
- Messaging remains authoritative for actual provider WhatsApp/Messenger messages. Opening a manual WhatsApp composer does not create a Messaging outbound message.

## Frozen evidence vocabulary

Implementation names may follow repository conventions but must preserve these meanings:

| Evidence | Meaning | Must not be presented as |
| --- | --- | --- |
| `ACCESS_ISSUED` | Exact-revision capability created | sent, delivered, viewed |
| `EMAIL_DELIVERY_INITIATED` | Authorized email delivery attempt started | provider accepted, delivered, read |
| `EMAIL_PROVIDER_ACCEPTED` | Real future email adapter/provider accepted the attempt at its boundary | customer read/viewed |
| `EMAIL_DELIVERY_FAILED` | Defensible adapter/provider failure evidence | customer rejection |
| `WHATSAPP_COMPOSER_OPENED` | Prefilled click-to-chat composer opened | sent, delivered, read |
| `VIEW_CONFIRMED` | Separate short-lived browser challenge confirmed after visible dwell | legal identity proof |
| `CUSTOMER_ACCEPTED` | Holder of valid exact-revision capability accepted that offer | operational conversion succeeded unless canonical conversion actually committed |
| `CUSTOMER_DECLINED` | Holder of valid exact-revision capability declined that offer | decline of any later revision |
| `ACCESS_REVOKED` | Grant explicitly disabled | Quote deleted |
| `ACCESS_SUPERSEDED` | Newer revision became customer-facing and old grant became non-actionable | old link redirected to new pricing |

`QuoteStatus` remains business lifecycle; delivery/engagement evidence is orthogonal and append-only.

## Security invariants

- Capability entropy: at least 256 random bits.
- Raw token: returned only as needed to construct the customer URL; never durably stored.
- Persistence: one-way token fingerprint/hash plus exact Quote/revision binding and audit metadata.
- URL: opaque capability only; no PII or internal IDs.
- Effective expiry: `min(Quote.validUntil, configured maximum customer-link lifetime)`.
- Expired, revoked and superseded grants fail closed for actionable operations.
- Old revision links never display a newer commercial revision.
- Public projection uses stored revision/line-item pricing; the client does not recalculate price.
- Customer/Property PII is minimized; internal notes/cost/profitability/resolution/auth data are excluded.
- Public routes require rate limiting, no-index, private/no-store caching posture, safe non-enumerating errors, token leakage controls, replay/idempotency protection and explicit response confirmation.

## Human-view protocol

A GET that resolves/renders the capability does **not** create `VIEW_CONFIRMED`.

The rendered page obtains/uses a short-lived server-issued challenge bound to the valid grant and suitable browser/session/context. A separate confirmation request is eligible only after the page is visible for a small configured dwell threshold. Challenge expiry and idempotency/replay controls prevent ordinary retries from creating unlimited unique views.

This is strong operational engagement evidence, not cryptographic proof that a specific person read the Quote.

## Customer response contract

Accept/Decline bind to the exact valid grant, Quote and immutable revision and use durable idempotent response identity.

For **Accept**:

1. preserve valid customer acceptance evidence for the exact revision;
2. run/reuse canonical Quote acceptance preflight;
3. when preflight is fully ready, invoke/refactor into the existing authoritative atomic conversion service;
4. when conversion cannot safely complete, retain `CUSTOMER_ACCEPTED` evidence and surface internal completion/attention without claiming conversion success.

For **Decline**, use a dedicated customer-response boundary that reuses/refactors canonical Quote decline authority. Do not call the ADMIN controller.

## Behavioral fixtures for later runtime/tests

| Fixture | Expected contract behavior |
| --- | --- |
| Valid access | Resolve only the exact bound revision and limited public projection; GET creates no view evidence. |
| Unknown token | Safe generic failure; do not reveal whether any Quote/internal identifier exists. |
| Expired token | Fail closed; no actionable projection/response. |
| Revoked token | Fail closed; safe unavailable state. |
| Superseded revision | Do not show latest pricing; old grant is non-actionable and may show safe revised-offer guidance. |
| Bot/simple GET | Render/resolve as policy permits; never append `VIEW_CONFIRMED`. |
| Confirmed human view | Valid short-lived challenge + visible dwell + valid grant appends defensible `VIEW_CONFIRMED`. |
| Duplicate view confirmation | Idempotent/replay-safe; duplicate request must not fabricate unlimited unique views. |
| Forwarded link | Another holder can use a still-valid bearer capability; do not claim verified customer identity. |
| Valid customer accept | Bind acceptance to exact grant/revision and execute hybrid acceptance contract. |
| Duplicate accept | Idempotently recover the same customer-response/conversion outcome; never duplicate Work Orders/agreements/evidence. |
| Accept after supersession | Fail closed; old revision cannot accept newer offer. |
| Accept after expiry | Fail closed; preserve no new actionable acceptance. |
| Accept + canonical preflight passes | Reuse authoritative acceptance/conversion transaction; only committed canonical result counts as operationally accepted/converted. |
| Accept + preflight needs internal completion | Preserve exact-revision `CUSTOMER_ACCEPTED`; surface internal action; do not mark operational conversion successful. |
| Customer decline | Exact-revision, valid-capability, idempotent decline through customer-response boundary reusing canonical decline authority. |
| WhatsApp composer opened | Append `WHATSAPP_COMPOSER_OPENED` only; no fake Messaging message, sent/delivered/read or Correspondence acceptance. |
| Email provider accepted | Only real adapter evidence may produce provider-accepted state; it remains distinct from `VIEW_CONFIRMED`/read. |

## Manual WhatsApp preparation

Initial delivery prepares a standard WhatsApp click-to-chat/deep link using the selected/snapshotted customer mobile, concise message and secure Quote URL. Staff manually press Send. This is separate from WhatsApp Flow/PhotoPicker and does not require Meta API-initiated sending.

## Implementation sequencing guardrail

Slice B may implement only the access-grant persistence/security foundation and secure exact-revision public read projection with expiry/revocation/supersession behavior. Human-view runtime, customer response runtime, email transport, WhatsApp composer UI and broader ADMIN delivery UI remain later slices unless separately approved.