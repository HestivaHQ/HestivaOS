# Secure Customer Quote Access V1

Status: **SLICE B IMPLEMENTED / LATER ENGAGEMENT AND RESPONSE SLICES DEFERRED** — 2026-08-24.

ADR-0089 is the durable decision authority. This document is the focused current-state contract for secure customer Quote access. Slice B implements the access-grant persistence/security foundation and exact-revision public read projection only. Human-view evidence, customer Accept/Decline, email transport, WhatsApp composer UI and the customer-facing web page remain unimplemented.

## Authority boundaries

- `Quote` + the exact immutable `QuoteRevision` remain authoritative for commercial state, stored pricing and lifecycle.
- Customer access is a bearer capability over a deliberately limited projection; it is not a customer account and does not prove legal identity.
- Public customer response endpoints must never expose/call ADMIN controllers directly.
- Existing canonical Quote acceptance/preflight/conversion and decline authority must be reused/refactored, not cloned.
- Correspondence remains authoritative for immutable rendered correspondence and provider-neutral email delivery attempts.
- Messaging remains authoritative for actual provider WhatsApp/Messenger messages. Opening a manual WhatsApp composer does not create a Messaging outbound message.

## Slice B access-grant persistence

Migration `20260824074500_secure_quote_customer_access_grants` adds `quote_customer_access_grants` as the bounded persistence model for customer Quote capabilities.

Each grant stores:

- one canonical Quote UUID;
- one exact immutable Quote revision number, protected by a composite database foreign key to `quote_revisions(quote_id, revision_number)`;
- one unique SHA-256 token fingerprint;
- effective expiry;
- explicit revocation actor/time;
- explicit supersession time and successor-grant identity;
- creator User identity;
- creation/update timestamps.

There is no raw-token column. A partial unique index allows at most one unresolved non-revoked/non-superseded grant per Quote. Issuance serializes per Quote with a PostgreSQL transaction advisory lock. Re-issuance rotates the bearer token and atomically marks the previous unresolved grant superseded before creating the successor, so a retry cannot leave multiple contradictory actionable grants. The supersession self-reference is deferred until transaction commit so the old and successor rows can be changed atomically.

The implementation accesses this small security table through parameterized Prisma raw SQL while continuing to use the existing typed Prisma Quote/QuoteRevision reads as business authority. The migration itself owns the database constraints; no duplicate Quote model or pricing model is introduced.

## Token issuance and resolution

`QuoteCustomerAccessService` generates exactly 32 random bytes (`256` bits) with Node cryptographic randomness and base64url-encodes them. The raw token contains no Quote/Customer/Property/phone/email/internal identifier. Only `SHA-256(raw token)` is persisted.

ADMIN-only issuance is exposed separately from the existing Quote review controller through:

`POST /api/v1/quotes/:id/customer-access`

with `expectedRevisionNumber`. Only the current unexpired `SUBMITTED` revision can be issued. The raw token is returned once to the authenticated trusted caller so a later delivery slice can construct the customer capability URL. A lost issuance response is recovered by re-issuing/rotating rather than by storing recoverable raw capability material.

ADMIN-only revocation is:

`POST /api/v1/quotes/:id/customer-access/revoke`

and is revision-checked. Repeated revocation is a safe no-op once no actionable grant remains.

The public read boundary is deliberately fixed-path:

`POST /api/v1/public/quote-access/resolve`

with:

`Authorization: QuoteCapability <opaque-token>`

The capability is **not** placed in the API URL path or query string. HestivaOS's global request logger records the request path, so a path-token design would leak bearer material into operational logging. The fixed endpoint keeps the application log path constant; the request logger does not record Authorization headers or bodies. Upstream platform/request logging must likewise not be configured to persist Authorization header contents.

Malformed, unknown, expired, revoked, superseded, stale-revision and otherwise unavailable capabilities fail with the same generic public unavailable response. The raw token is never included in errors, durable metadata or logs by this runtime.

## Expiry configuration

`HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS` is a required Railway/API runtime value. It must be a positive integer. There is intentionally no source-code default because no business maximum lifetime was frozen in ADR-0089.

At issuance:

`effective expiry = min(Quote.validUntil, now + configured maximum customer-link lifetime)`.

Missing/invalid configuration fails issuance closed. Resolution independently checks both the stored grant expiry and current canonical Quote validity.

## Revision and supersession behavior

A grant resolves only its stored exact revision. Resolution also requires that exact revision still be the Quote's current revision; it never follows `currentRevisionNumber` to different pricing. A newly issued customer-facing offer supersedes the prior unresolved grant for the Quote in the same serialized transaction.

Revoked, superseded and expired capabilities are non-actionable. Slice B returns the same safe unavailable response for those token states; a later customer page may present richer stale/revised guidance only after a safe transport/UI design that does not disclose arbitrary Quote existence.

## Exact public Quote projection

A valid capability returns a server-derived projection from the exact persisted `QuoteRevision` and its stored `QuoteLineItem` rows. No pricing calculation runs in this boundary.

The projection contains only:

- public Business Profile fields whose existing share flags permit disclosure;
- Quote public reference;
- exact revision number;
- business lifecycle status and whether that status is currently actionable for later customer response;
- canonical Quote validity and capability expiry;
- selected customer-useful property descriptors: property type, suburb, floor-size band, bedroom/bathroom/living-area/storey/outdoor-area facts where present;
- selected request facts: primary service, frequency/custom frequency note, home condition, add-ons, eco-product preference, Laundry/Ironing structure and Post-Event structure where present;
- selected visit facts: preferred/alternative date, preferred time, flexibility, urgency and recurring note where present;
- exact stored currency, line-item labels/descriptions/quantities/unit/line totals, subtotal, discount, tax flags/tax and final total.

The projection deliberately excludes Customer name/email/mobile, street address, access/security/key information, household/safety details, general/internal notes, Customer/Property resolution state, User/auth identities, database UUIDs, line-item internal codes, provider configuration, token fingerprint, operational-cost provenance, internal profitability/margins and any newer revision data.

## Public-route security implemented in Slice B

- fixed route plus Authorization-header capability transport, avoiding raw bearer values in HestivaOS request paths;
- generic non-enumerating unavailable errors for token/grant failures;
- `Cache-Control: private, no-store, max-age=0` and `Pragma: no-cache`;
- `X-Robots-Tag: noindex, nofollow, noarchive`;
- `Referrer-Policy: no-referrer`;
- public capability route bypasses Supabase user authentication only through the existing `@Public()` boundary; existing ADMIN Quote routes remain unchanged/protected;
- a conservative process-local fixed-window limiter permits at most 30 resolution attempts per observed transport peer per minute. This is a minimum API abuse boundary, not a distributed WAF guarantee. A future production-hardening slice may replace/augment it with shared edge/distributed throttling without changing capability semantics.

No `VIEW_CONFIRMED` event is produced by resolution. Slice B has no customer-facing GET route and no customer page.

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

`QuoteStatus` remains business lifecycle; delivery/engagement evidence is orthogonal and append-only. Slice B does not add any engagement-event persistence.

## Human-view protocol — deferred to Slice C

A GET that resolves/renders the capability does **not** create `VIEW_CONFIRMED`.

The future rendered page must obtain/use a short-lived server-issued challenge bound to the valid grant and suitable browser/session/context. A separate confirmation request is eligible only after the page is visible for a small configured dwell threshold. Challenge expiry and idempotency/replay controls must prevent ordinary retries from creating unlimited unique views.

This is strong operational engagement evidence, not cryptographic proof that a specific person read the Quote.

## Customer response contract — deferred

Accept/Decline bind to the exact valid grant, Quote and immutable revision and use durable idempotent response identity.

For **Accept**:

1. preserve valid customer acceptance evidence for the exact revision;
2. run/reuse canonical Quote acceptance preflight;
3. when preflight is fully ready, invoke/refactor into the existing authoritative atomic conversion service;
4. when conversion cannot safely complete, retain `CUSTOMER_ACCEPTED` evidence and surface internal completion/attention without claiming conversion success.

For **Decline**, use a dedicated customer-response boundary that reuses/refactors canonical Quote decline authority. Do not call the ADMIN controller.

Slice B implements neither response.

## Behavioral fixtures

| Fixture | Slice B behavior / later contract |
| --- | --- |
| Valid access | Resolve only the exact bound revision and limited public projection; no view evidence. |
| Unknown token | Safe generic failure; do not reveal whether any Quote/internal identifier exists. |
| Expired token | Fail closed; no actionable projection/response. |
| Revoked token | Fail closed; safe unavailable state. |
| Superseded revision | Do not show latest pricing; old grant is non-actionable. |
| Bot/simple request | Capability resolution creates no `VIEW_CONFIRMED`. |
| Confirmed human view | Deferred to Slice C: valid short-lived challenge + visible dwell + valid grant. |
| Duplicate view confirmation | Deferred to Slice C and must be idempotent/replay-safe. |
| Forwarded link | Another holder can use a still-valid bearer capability; do not claim verified customer identity. |
| Valid customer accept | Deferred; bind acceptance to exact grant/revision and execute hybrid acceptance contract. |
| Duplicate accept | Deferred; never duplicate Work Orders/agreements/evidence. |
| Accept after supersession/expiry | Deferred customer action but capability resolution already fails closed. |
| WhatsApp composer opened | Deferred; later append `WHATSAPP_COMPOSER_OPENED` only. |
| Email provider accepted | Deferred; only real adapter evidence may produce provider-accepted state and it remains distinct from view/read. |

## Manual WhatsApp preparation — deferred

Initial delivery will prepare a standard WhatsApp click-to-chat/deep link using the selected/snapshotted customer mobile, concise message and secure Quote URL. Staff manually press Send. This is separate from WhatsApp Flow/PhotoPicker and does not require Meta API-initiated sending.

## Implementation sequencing guardrail

Slice C may add only the bot-resistant human-view challenge/evidence foundation and ADMIN engagement summary needed for that evidence, unless separately approved. Customer response runtime, email transport, WhatsApp composer UI and broader ADMIN delivery UI remain later slices.
