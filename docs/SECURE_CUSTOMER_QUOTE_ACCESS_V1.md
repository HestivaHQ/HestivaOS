# Secure Customer Quote Access V1

Status: **SLICE D IMPLEMENTED — SECURE CUSTOMER RESPONSE FOUNDATION** — 2026-08-24.

ADR-0089 remains the durable customer-access authority. Slices B/C provide exact-revision bearer access and bot-resistant `VIEW_CONFIRMED` evidence. Slice D adds exact-revision customer ACCEPT/DECLINE evidence and the approved hybrid conversion path. Customer-facing page UI, email transport, WhatsApp composer/Send-Share UI, Meta delivery, PhotoPicker and accounting/ERP remain deferred.

## Authority boundaries

- `Quote` + exact immutable `QuoteRevision` remain commercial authority.
- A capability proves possession, not legal identity.
- Public response routes use a dedicated service boundary and never call ADMIN controllers.
- Canonical `QuoteReviewService.preflight`, `accept` and `decline` remain operational lifecycle authority; Slice D does not implement a second acceptance/decline engine.
- Customer response evidence is append-only and separate from operational actor attribution.

## Access and view foundation

The Slice B/C contracts remain unchanged: raw capability/challenge material is never stored, grants bind one exact revision, stale/revoked/superseded/expired grants fail closed, public responses use private/no-store/noindex/no-referrer headers, and HTTP resolve alone is not `VIEW_CONFIRMED`.

## Slice D customer response evidence

Migration `20260824114000_quote_customer_response_evidence` extends the append-only evidence vocabulary with `CUSTOMER_ACCEPTED` and `CUSTOMER_DECLINED` and adds `quote_customer_responses` as the durable response/idempotency projection. Each response binds exactly one grant, Quote and immutable revision and links to its append-only engagement event.

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

After evidence exists, HestivaOS runs canonical acceptance preflight. If ready, the existing `QuoteReviewService.accept()` transaction performs the normal Customer/Property resolution, Work Order creation, recurring-agreement creation and canonical Quote transition. If preflight or conversion cannot safely complete, the customer decision remains durable and the response returns `PENDING_INTERNAL_COMPLETION`; no fake Work Order or Quote acceptance is claimed.

A later retry/internal completion may reuse the preserved customer response; another customer click is not required to establish the customer decision again.

## Reserved CUSTOMER_SELF_SERVICE system actor

Automatic operational conversion needs a valid `User.id` because existing canonical audit/foreign-key fields such as `Quote.acceptedByUserId`, `WorkOrder.createdById`, Customer owner and activity actor are User-backed. Slice D therefore introduces one deterministic reserved non-human row:

- semantic identity: `CUSTOMER_SELF_SERVICE`;
- display name: `HestivaOS Customer Self-Service`;
- stable reserved UUIDs committed by migration, never environment-random;
- reserved `.invalid` email used only to satisfy the existing unique User shape;
- `UserStatus.INACTIVE`;
- no Supabase Auth account/password/session is created.

The existing `SupabaseAuthGuard` resolves interactive sessions by a verified Supabase `authUserId` and rejects INACTIVE application Users. The reserved row therefore cannot operate as a normal staff login and must not be provisioned in Supabase Auth. Its role value is structural only and grants no session capability.

The distinction is invariant:

**Customer decides. HestivaOS executes.**

`CUSTOMER_ACCEPTED` is the customer-capability-holder decision. The reserved system actor on `acceptedByUserId`, `createdById` or activities means only that HestivaOS executed the resulting canonical operation. It must never be rendered as an employee/customer personally accepting the Quote. Safe response-event metadata records only `source: PUBLIC_QUOTE_CAPABILITY`; no raw bearer material is stored.

This is documented here as an implementation convention under ADR-0089's already-approved hybrid acceptance/audit architecture. No new ADR is required because it does not change bearer semantics, Quote authority, authentication authority or canonical conversion rules.

## Customer DECLINE

`CUSTOMER_DECLINED` is likewise exact-revision append-only evidence. The dedicated response boundary then reuses `QuoteReviewService.decline()` rather than duplicating decline lifecycle logic. The same reserved execution actor satisfies canonical User-backed audit fields; it identifies HestivaOS execution, not customer identity.

## ADMIN response summary

ADMIN-only response projection:

`GET /api/v1/quotes/:id/customer-access/response?expectedRevisionNumber=<n>`

returns the exact revision and, when present, the durable customer decision, server response time and `PUBLIC_QUOTE_CAPABILITY` source. It does not expose capability material or pretend that operational conversion necessarily succeeded.

The existing engagement summary remains independently available for view/access evidence.

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

## Out of scope after Slice D

- customer-facing Quote page beyond these minimal APIs;
- email provider/transport;
- WhatsApp composer and Send/Share UI;
- Meta delivery/Flow/PhotoPicker work;
- accounting/ERP;
- PR #214 changes.
