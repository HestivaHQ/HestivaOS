# Secure Customer Quote Access V1

Status: **SLICE C IMPLEMENTED / CUSTOMER RESPONSE AND DELIVERY SLICES DEFERRED** — 2026-08-24.

ADR-0089 is the durable decision authority. This document is the focused current-state contract for secure customer Quote access. Slice B implements access-grant persistence and exact-revision public read projection. Slice C adds append-only `VIEW_CONFIRMED` evidence, short-lived view challenges and an ADMIN engagement summary. Customer Accept/Decline, email transport, WhatsApp composer UI, Send/Share UI and the customer-facing web page remain unimplemented.

## Authority boundaries

- `Quote` + the exact immutable `QuoteRevision` remain authoritative for commercial state, stored pricing and lifecycle.
- Customer access is a bearer capability over a deliberately limited projection; it is not a customer account and does not prove legal identity.
- Public customer response endpoints must never expose/call ADMIN controllers directly.
- Existing canonical Quote acceptance/preflight/conversion and decline authority must be reused/refactored, not cloned.
- Correspondence remains authoritative for immutable rendered correspondence and provider-neutral email delivery attempts.
- Messaging remains authoritative for actual provider WhatsApp/Messenger messages. Opening a manual WhatsApp composer does not create a Messaging outbound message.
- `QuoteStatus` remains the business lifecycle. Engagement/view evidence is orthogonal and append-only.

## Slice B access-grant persistence

Migration `20260824074500_secure_quote_customer_access_grants` adds `quote_customer_access_grants` as the bounded persistence model for customer Quote capabilities.

Each grant stores one canonical Quote UUID, one exact immutable Quote revision number, a unique SHA-256 token fingerprint, effective expiry, revocation/supersession evidence, creator/revoker identity and timestamps. There is no raw-token column.

A partial unique index allows at most one unresolved non-revoked/non-superseded grant per Quote. Issuance serializes per Quote with a PostgreSQL transaction advisory lock. Re-issuance rotates the bearer token and atomically supersedes the prior unresolved grant before creating its successor.

`QuoteCustomerAccessService` generates exactly 32 random bytes (256 bits) with Node cryptographic randomness and base64url-encodes them. Only `SHA-256(raw token)` is stored.

ADMIN issuance:

`POST /api/v1/quotes/:id/customer-access`

ADMIN revocation:

`POST /api/v1/quotes/:id/customer-access/revoke`

Public exact-revision resolution:

`POST /api/v1/public/quote-access/resolve`

with:

`Authorization: QuoteCapability <opaque-token>`

The capability is not placed in the API URL path or query string. HestivaOS request logging records the fixed route path, not Authorization/body contents. Upstream logging must likewise not persist Authorization values.

Malformed, unknown, expired, revoked, superseded, stale-revision and otherwise unavailable capabilities use the same generic public unavailable response.

## Expiry configuration

`HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS` is a required API runtime value and has no source-code default.

At issuance:

`effective expiry = min(Quote.validUntil, now + configured maximum customer-link lifetime)`.

Resolution independently checks the stored grant expiry, current Quote validity, exact current revision and customer-readable Quote state.

## Revision and supersession behavior

A grant resolves only its stored exact revision and never follows `Quote.currentRevisionNumber` to newer pricing. A newly issued customer-facing offer supersedes the prior unresolved grant for the Quote in the same serialized transaction.

Revoked, superseded, expired and stale-revision capabilities are non-actionable. Old links never silently expose a newer revision.

## Exact public Quote projection

A valid capability returns a server-derived projection from the exact persisted `QuoteRevision` and stored `QuoteLineItem` rows. No pricing calculation runs in the public boundary.

The projection includes only public Business Profile fields permitted by existing share flags, Quote public reference, exact revision/status/actionability/validity, selected customer-useful property/request/visit facts and exact stored pricing/line items.

It excludes Customer name/email/mobile, street address, access/security/key information, household/safety details, general/internal notes, Customer/Property resolution state, User/auth identities, database UUIDs, line-item internal codes, provider configuration, token fingerprints, operational-cost provenance, internal profitability/margins and newer revision data.

## Slice C engagement persistence

Migration `20260824095000_quote_customer_view_engagement` adds two bounded structures:

- `quote_customer_view_challenges` — short-lived challenge state bound to one access grant, Quote and exact revision. It stores only a SHA-256 challenge fingerprint, issue/expiry time and eventual confirmation/event linkage. The raw challenge is never stored.
- `quote_customer_engagement_events` — append-only engagement evidence. Slice C defines the database event type `VIEW_CONFIRMED`; future evidence types may be added deliberately without adding mutable communication timestamps to `Quote`.

Each engagement event binds to access grant, Quote and exact immutable revision and stores event type, server occurrence time, unique idempotency identity and safe metadata only. Slice C metadata records only protocol identity (`visible-dwell-v1`); it does not store IP/device fingerprints, raw capability/challenge values or customer PII.

Routine view evidence is not copied into `QuoteStatus` and does not flood `QuoteActivity`.

## Human-view protocol implemented in Slice C

Initial capability resolution does **not** create `VIEW_CONFIRMED`. A link preview, security scanner or simple HTTP client that only resolves/fetches the Quote therefore creates no view evidence.

A future rendered customer page uses two separate fixed-path API calls after successfully resolving a capability:

1. `POST /api/v1/public/quote-access/view-challenge`
2. `POST /api/v1/public/quote-access/view-confirm`

Both continue to present the capability only through:

`Authorization: QuoteCapability <opaque-token>`

### Challenge issuance

A challenge is issued only after the Slice B access resolver proves that the capability currently resolves to a customer-readable exact revision.

- Raw challenge entropy: exactly 32 cryptographically random bytes (256 bits), base64url encoded.
- Durable storage: SHA-256 fingerprint only.
- Maximum technical lifetime: **5 minutes**.
- Effective challenge expiry: `min(issue time + 5 minutes, access-grant expiry)`.
- Challenge issuance itself creates no engagement event and is not a view.

### Browser evidence boundary

The confirmation request supplies only:

- the raw opaque challenge returned by the challenge endpoint; and
- `pageVisible: true` while the rendered document is actually visible.

The browser does **not** supply an authoritative viewed-at timestamp, dwell duration, Quote ID or revision number. Server challenge issue time and server confirmation time determine dwell.

The minimum visible dwell threshold is **2 seconds**. This is deliberately small enough not to distort the customer experience while preventing immediate resolve/unfurl requests from qualifying.

A future customer-page implementation must wait until the document is visible and at least the server-advertised `minimumVisibleDwellMs` has elapsed before calling confirmation. The server remains authoritative and rejects confirmation before its own 2-second threshold even if the client calls early.

### Confirmation transaction

Confirmation re-resolves the capability and then transactionally locks/rechecks the challenge, grant and Quote before writing evidence. It fails closed if, before confirmation, any of the following becomes true:

- challenge expired;
- access grant expired;
- access grant revoked;
- access grant superseded;
- canonical Quote expired;
- exact revision became stale;
- Quote state is no longer customer-readable;
- challenge belongs to a different grant/Quote/revision.

A challenge issued before revocation or supersession therefore cannot be used afterward.

On the first eligible confirmation, one append-only `VIEW_CONFIRMED` event is written with server occurrence time. The challenge is linked to that event in the same SERIALIZABLE transaction.

The event idempotency identity is derived from the internal challenge UUID (`view-challenge:<challenge-id>`), never from the raw challenge. A duplicate confirmation of the same confirmed challenge returns the existing occurrence with `replayed: true` and creates no additional event.

Distinct successfully confirmed challenges may create distinct view events, which allows later genuine revisits to increment the view count without refresh/retry duplication.

## Bot and preview resistance

The signal is intentionally stronger than URL retrieval:

- Quote resolution alone produces no view event;
- challenge issuance produces no view event;
- a confirmation must use a valid one-time/replay-safe challenge after server-measured dwell;
- the browser must explicitly state that the page is visible;
- stale/revoked/superseded access fails during confirmation, not merely at challenge issuance.

This prevents ordinary link unfurlers and security scanners that only fetch/resolve resources from producing `VIEW_CONFIRMED`.

It does **not** cryptographically prove that a legal person or human eyeball read the Quote. A sophisticated JavaScript-capable automation that deliberately follows the full protocol could still satisfy the operational signal. ADMIN UI may display this evidence as **Viewed**, but documentation and product semantics must retain this limitation.

No device fingerprinting, invasive tracking, analytics or IP-as-customer-identity mechanism is introduced.

## Public-route abuse controls

Slice B resolution remains limited to 30 attempts per observed transport peer per minute.

Slice C adds separate process-local fixed-window limits:

- challenge issuance: **10 attempts per observed transport peer per minute**;
- confirmation: **30 attempts per observed transport peer per minute**.

The observed transport peer is an abuse-control key only; it is not persisted as engagement evidence and is not treated as customer identity. These process-local controls are a minimum API boundary, not a distributed/WAF guarantee.

All Slice C public endpoints retain `private, no-store`, `Pragma: no-cache`, `X-Robots-Tag: noindex, nofollow, noarchive` and `Referrer-Policy: no-referrer` response posture.

## ADMIN engagement summary

ADMIN-only summary:

`GET /api/v1/quotes/:id/customer-access/engagement?expectedRevisionNumber=<n>`

The summary is a projection over append-only view evidence and current access-grant/Quote state. It returns:

- exact `revisionNumber`;
- `firstViewedAt` — minimum `VIEW_CONFIRMED.occurred_at` for the exact Quote revision;
- `lastViewedAt` — maximum occurrence time;
- `viewCount` — count of distinct persisted `VIEW_CONFIRMED` events;
- derived `accessState` for that revision (`NONE`, `ACTIVE`, `REVOKED`, `SUPERSEDED`, `STALE_REVISION`, `EXPIRED`, or `QUOTE_UNAVAILABLE`).

No mutable `firstViewedAt`/`lastViewedAt`/`viewCount` fields are added to `Quote`.

## Frozen evidence vocabulary

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

`WHATSAPP_COMPOSER_OPENED != SENT`, `EMAIL_PROVIDER_ACCEPTED != READ`, and HTTP resolve/fetch `!= VIEW_CONFIRMED` remain invariant.

## Behavioral fixtures/current behavior

| Fixture | Behavior |
| --- | --- |
| Valid access | Resolve only exact bound revision; resolution creates no view evidence. |
| Unknown/expired/revoked/superseded capability | Safe generic failure. |
| Stale revision | Never resolve/confirm against the newer revision. |
| Bot/simple resolve | No `VIEW_CONFIRMED`. |
| Valid challenge | 256-bit raw challenge returned once; fingerprint only persisted. |
| Challenge before 2-second dwell | Confirmation rejected; no event. |
| Challenge after 2-second visible dwell | One `VIEW_CONFIRMED` event. |
| Duplicate confirmation | Returns existing event as replay; count does not increment. |
| Distinct later valid challenge | Creates a later distinct `VIEW_CONFIRMED`; first view remains original, last view/count advance. |
| Challenge then grant revoked/superseded/expired | Confirmation fails closed. |
| Forwarded valid link | Holder can still exercise bearer capability; no verified-identity claim. |
| Customer Accept/Decline | Deferred to Slice D+; no response runtime exists in Slice C. |
| WhatsApp composer/email provider | Deferred; no delivery semantics added by Slice C. |

## Customer response contract — deferred

Accept/Decline must bind to the exact valid grant, Quote and immutable revision with durable idempotent response identity.

For Accept, later runtime must preserve valid customer acceptance evidence, run/reuse canonical acceptance preflight and use the existing authoritative conversion service when ready. If conversion cannot safely complete, it must retain customer acceptance evidence and surface internal completion without pretending operational conversion succeeded.

Decline must use the dedicated customer-response boundary and reuse/refactor canonical Quote decline authority. Public routes must never call ADMIN controllers.

## Manual WhatsApp and email delivery — deferred

Initial WhatsApp delivery will prepare standard click-to-chat/deep-link content and record only truthful composer-open evidence. Email transport will reuse Correspondence and may claim provider acceptance only from real provider evidence. Neither is implemented in Slice C.

## Implementation sequencing guardrail

The next slice may implement only the separately approved customer-response foundation. Customer-facing Quote UI, email transport, WhatsApp composer/Send-Share UI, Meta delivery, PhotoPicker and accounting/ERP remain outside Slice C and require their own approved scope.
