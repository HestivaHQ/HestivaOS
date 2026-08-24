# Secure Customer Quote Access V1

Status: **MOBILE CUSTOMER QUOTE PAGE V1 IMPLEMENTED** — 2026-08-24.

ADR-0089 remains the durable customer-access authority. Slices B/C provide exact-revision bearer access and bot-resistant `VIEW_CONFIRMED` evidence. Slice D adds exact-revision customer ACCEPT/DECLINE evidence and the approved hybrid conversion path. The mobile customer page now provides the browser experience over those contracts. Email transport, WhatsApp composer/Send-Share UI, Meta delivery, PhotoPicker and accounting/ERP remain deferred.

## Authority boundaries

- `Quote` + exact immutable `QuoteRevision` remain commercial authority.
- A capability proves possession, not legal identity.
- Public response routes use a dedicated service boundary and never call ADMIN controllers.
- Canonical `QuoteReviewService.preflight`, `accept` and `decline` remain operational lifecycle authority; the customer page does not implement a second acceptance/decline engine.
- Customer response evidence is append-only and separate from operational actor attribution.

## Access and view foundation

Raw capability/challenge material is never stored, grants bind one exact revision, stale/revoked/superseded/expired grants fail closed, public API responses use private/no-store/noindex/no-referrer headers, and HTTP resolve alone is not `VIEW_CONFIRMED`.

## Customer response evidence

The response table is the durable response/idempotency projection. Each response binds exactly one grant, Quote and immutable revision and links to its append-only engagement event.

Public response endpoint:

`POST /api/v1/public/quote-access/respond`

with `Authorization: QuoteCapability <opaque-token>` and body fields:

- `decision`: `CUSTOMER_ACCEPTED` or `CUSTOMER_DECLINED`;
- `idempotencyKey`: opaque caller-generated 8–128 character replay identity;
- `confirmed: true`: mandatory explicit confirmation of the irreversible response.

The endpoint is limited to 10 attempts per observed transport peer per minute and retains private/no-store/noindex/no-referrer response headers. The capability, Quote UUID and revision are not accepted from client body/query data as authoritative identifiers.

A response transaction locks and rechecks grant + Quote state. Expired, revoked, superseded or stale-revision grants fail closed. A grant cannot be changed from ACCEPT to DECLINE or vice versa after a response is durably recorded. Retries with the same response return the existing evidence instead of creating another response event.

## Hybrid customer ACCEPT

`CUSTOMER_ACCEPTED` means only: **the holder of a valid exact-revision customer capability accepted that offer**. It is persisted before operational conversion is attempted.

After evidence exists, HestivaOS runs canonical acceptance preflight. If preflight proves an expected business/readiness blocker, the response is `PENDING_INTERNAL_COMPLETION`; the durable customer decision remains intact and no operational success is claimed.

If preflight is ready, the existing `QuoteReviewService.accept()` transaction performs normal canonical conversion. It remains the sole conversion authority and retains its SERIALIZABLE, exact-revision, rollback, serialization-retry and already-accepted recovery protections.

Unexpected programming, database, infrastructure or other internal exceptions are never disguised as normal pending business state. Customer acceptance evidence remains durable, while the public request fails with a generic server error that does not expose the underlying exception text. A later replay with the same response/idempotency identity reuses the existing `CUSTOMER_ACCEPTED` evidence and retries canonical conversion safely; the customer does not need to accept again.

## Reserved CUSTOMER_SELF_SERVICE system actor

Automatic operational conversion uses the deterministic reserved non-human `CUSTOMER_SELF_SERVICE` User row introduced by Slice D. It remains INACTIVE, has no Supabase Auth account/session, and exists only to satisfy canonical User-backed operational audit/foreign-key fields.

The distinction remains invariant: **Customer decides. HestivaOS executes.** `CUSTOMER_ACCEPTED` is the capability-holder decision; the reserved actor means only that HestivaOS executed the resulting canonical operation.

## Customer DECLINE

`CUSTOMER_DECLINED` is exact-revision append-only evidence. The dedicated response boundary reuses `QuoteReviewService.decline()`. Concurrent incompatible state changes remain conflicts; unexpected canonical decline failures become generic internal failures while durable decline evidence remains available for same-idempotency recovery.

## Mobile customer Quote page

The public browser route is `/quote`. It is intentionally a fixed route with no capability in the server-visible path or query string.

Customer links use the fragment transport `/quote#<opaque-capability>`. URL fragments are handled by browser JavaScript and are not sent as part of the HTTP request path to Next.js/Cloudflare. The client validates the 43-character opaque capability, immediately removes the fragment from visible browser history with `history.replaceState`, retains the capability only in component memory, and sends it to the existing fixed public API endpoints through `Authorization: QuoteCapability <token>`.

The page never writes the capability to localStorage/sessionStorage, DOM text, metadata or analytics. Public API fetches use `cache: no-store`, `credentials: omit` and `referrerPolicy: no-referrer`. Page metadata also declares noindex/nofollow/nocache and no-referrer. No third-party analytics or customer authentication is introduced.

The customer projection is rendered directly from the existing exact immutable revision response: public business fields, Quote reference, validity, selected service/request/property/visit facts, stored line items, subtotal, stored discount/adjustment, stored tax and stored total. The browser formats minor-unit amounts for display but does not recalculate Quote pricing or line totals. Internal IDs, internal cost/profitability data, unrestricted notes and unrelated customer/property data are not requested or rendered.

Customer-facing canonical states are translated into plain language. `SUBMITTED` is actionable, while canonical `ACCEPTED` and `DECLINED` are read-only. Expired, revoked, superseded, stale-revision and unknown capabilities deliberately converge on the same generic unavailable screen because the backend fails them closed without enumeration. `PENDING_INTERNAL_COMPLETION` is shown distinctly when returned by the response operation. A later enhancement may add a safe public response-state projection if persistent pending-state display across a fresh browser reload is required; this slice does not weaken the existing non-enumerating resolve contract to infer it.

### View confirmation client behavior

After a valid projection has rendered, the client issues one server view challenge per mounted page lifecycle. React Strict Mode/double effects are guarded by an in-memory one-shot ref. The client uses the server-returned `minimumVisibleDwellMs`; it starts the dwell timer only while `document.visibilityState === 'visible'`, cancels the timer when hidden, and confirms through `/view-confirm` only after the full visible dwell. Resolve alone never records a view. A later genuine page revisit can obtain a fresh challenge.

### Accept and decline UX

Accept and Decline are separate large mobile actions and neither commits on first tap. Each opens an accessible confirmation dialog showing the Quote reference and stored total. The explicit confirmation sends the canonical decision, `confirmed: true`, and a browser-generated UUID idempotency key.

The idempotency identity is generated when the explicit action is opened and retained for retries of that same action. `CONVERTED` shows a completed acceptance message. `PENDING_INTERNAL_COMPLETION` tells the customer that acceptance was received and that no second acceptance is needed. `DECLINED` shows the completed decline state. On an unexpected network/internal failure the page does not claim that a potentially durable decision was lost; it tells the customer that the decision may already have been received and permits retry using the same action identity. Stale/conflict/unavailable responses re-resolve the canonical projection where possible.

### Mobile and accessibility behavior

The page is designed for roughly 320–430 px phone widths first, with no horizontal-scrolling layout, prominent total, 50px-minimum action controls, semantic headings/buttons, visible focus outlines and a bottom-sheet-style confirmation dialog on narrow screens. Wider screens progressively center the same lightweight Quote card rather than becoming an internal HestivaOS application shell.

## ADMIN response summary

ADMIN-only response projection remains available at `GET /api/v1/quotes/:id/customer-access/response?expectedRevisionNumber=<n>`. It does not expose capability material or pretend that operational conversion necessarily succeeded.

## Frozen evidence vocabulary

| Evidence | Meaning | Must not be presented as |
| --- | --- | --- |
| `ACCESS_ISSUED` | Exact-revision capability created | sent, delivered, viewed |
| `WHATSAPP_COMPOSER_OPENED` | Prefilled click-to-chat composer opened | sent, delivered, read |
| `VIEW_CONFIRMED` | Browser challenge confirmed after visible dwell | legal identity proof |
| `CUSTOMER_ACCEPTED` | Valid exact-revision capability holder accepted | operational conversion succeeded unless canonical conversion committed |
| `CUSTOMER_DECLINED` | Valid exact-revision capability holder declined | decline of a later revision |
| `ACCESS_REVOKED` | Grant explicitly disabled | Quote deleted |
| `ACCESS_SUPERSEDED` | Old customer-facing grant became non-actionable | old link follows new pricing |

`CUSTOMER_ACCEPTED != system actor`. `WHATSAPP_COMPOSER_OPENED != SENT`. HTTP resolve/fetch `!= VIEW_CONFIRMED`.

## Deferred after Mobile Customer Quote Page V1

- email provider/transport;
- ADMIN Send/Share and WhatsApp composer UI;
- Meta delivery/Flow/PhotoPicker work;
- accounting/ERP;
- stronger customer identity/signature claims;
- PR #214 changes.
