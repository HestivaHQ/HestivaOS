# ADR-0089: Secure customer Quote access, engagement and response

## Status

Accepted — 2026-08-24.

## Context

HestivaOS already owns the canonical Quote aggregate, immutable Quote revisions, authoritative stored pricing, Customer/Property resolution, and atomic accepted-Quote conversion. Correspondence separately owns immutable rendered customer correspondence and provider-neutral delivery-attempt history. Messaging separately owns WhatsApp/Messenger provider conversation/message history.

Customers now need a QuickBooks-like way to receive a secure Quote link, inspect the exact offer, and accept or decline it without a HestivaOS account. Staff also need truthful evidence of delivery preparation and genuine customer engagement. A simple public Quote identifier, a raw bearer token stored in the database, or treating HTTP/link-preview fetches as customer views would weaken the existing authority and security boundaries.

This decision defines the architecture and security contract only. Runtime, schema, migrations, public routes, UI and live email transport are later slices.

## Decision

### 1. Authority and bounded context

The canonical `Quote` and one exact immutable `QuoteRevision` remain the sole business/pricing authority. Customer Quote access is a limited capability and projection over that authority; it is not a second Quote model and must not recalculate pricing client-side.

The customer-access boundary must not expose or call an ADMIN controller directly. Customer responses enter through a dedicated customer-response service/boundary that reuses or refactors into canonical Quote domain services.

Correspondence remains the provider-neutral authority for rendered email/customer correspondence and delivery-attempt chains. Messaging remains the authority for actual WhatsApp/Messenger provider messages. Neither is cloned by this capability.

### 2. Customer access grant

A customer access grant conceptually binds exactly one Quote to exactly one immutable revision. Runtime persistence introduced later must preserve at least:

- Quote identity and exact revision identity;
- a cryptographically strong opaque bearer token with at least 256 bits of entropy;
- only a one-way fingerprint/hash of the token at rest; the raw token must never be stored durably;
- explicit effective expiry;
- revocation state/evidence;
- supersession state/evidence;
- creator/audit identity and timestamps.

The customer URL must contain only the opaque capability value needed to resolve the grant. It must not encode customer PII, Quote/Customer/Property UUIDs, public Quote references, email addresses or phone numbers.

### 3. Bearer-capability semantics

Possession of a valid, unexpired, non-revoked, non-superseded capability grants access to the deliberately limited customer Quote projection. A forwarded valid link can therefore be used by another holder. The capability proves possession, not legal identity.

Risk is bounded through short/finite validity, explicit revocation, exact revision binding, conservative PII exposure, rate limiting, response safeguards, idempotency and safe errors. Stronger identity verification may be added only by a later explicit decision; it is not implied by this bearer capability.

### 4. Revision and supersession semantics

A grant never silently follows `Quote.currentRevisionNumber`. It remains bound to the exact revision for which it was issued.

When a newer revision becomes the customer-facing offer, previous active grants for superseded revisions become non-actionable. An old link may present a safe stale/revised-offer state, but must not display the newer commercial offer and must not accept or decline on behalf of that newer revision.

### 5. Expiry

The effective customer capability expiry is:

`min(Quote.validUntil, configured maximum customer-link lifetime)`.

No indefinite customer Quote capability is allowed. An expired grant fails closed and cannot record an actionable customer response.

### 6. Orthogonal delivery and engagement evidence

`QuoteStatus` remains the commercial/business lifecycle. `SENT`, `VIEWED` and transport states are not added to it.

Customer access, delivery preparation, engagement and response use append-only evidence with semantics equivalent to:

- `ACCESS_ISSUED` — a capability was created; this does not prove delivery or view;
- `EMAIL_DELIVERY_INITIATED` — an authorized email delivery attempt was initiated;
- `EMAIL_PROVIDER_ACCEPTED` — the configured adapter/provider accepted the attempt at its boundary; this does not prove inbox delivery or customer read;
- `EMAIL_DELIVERY_FAILED` — the provider/adapter supplied defensible failure evidence;
- `WHATSAPP_COMPOSER_OPENED` — HestivaOS prepared the message/link and opened the WhatsApp composer; this is not evidence that staff pressed Send;
- `VIEW_CONFIRMED` — the rendered customer page satisfied the separate browser confirmation protocol below;
- `CUSTOMER_ACCEPTED` — a valid customer response accepted the exact revision represented by the grant;
- `CUSTOMER_DECLINED` — a valid customer response declined that exact revision;
- `ACCESS_REVOKED` — an active grant was explicitly made non-actionable;
- `ACCESS_SUPERSEDED` — a grant became non-actionable because a newer revision became the customer-facing offer.

Exact persisted enum/model names may be chosen in the implementation slice if they preserve these frozen semantics and do not collide with active work.

The following equivalences are forbidden:

- `WHATSAPP_COMPOSER_OPENED != SENT`;
- `EMAIL_PROVIDER_ACCEPTED != READ`;
- initial or repeated HTTP `GET != VIEW_CONFIRMED`.

Routine views must not flood `QuoteActivity`. ADMIN UI may derive first-view, latest-view, view-count and delivery summaries from append-only evidence. High-value accepted/declined outcomes may additionally create Quote activities where consistent with canonical Quote audit history.

### 7. Bot-resistant human-view signal

Resolving or rendering the customer Quote with an HTTP GET must never create `VIEW_CONFIRMED`. Link-preview crawlers, email security scanners, WhatsApp/Facebook unfurlers and similar automated fetchers can issue GETs without a customer seeing the page.

A rendered customer page must instead obtain/use a short-lived server-issued view challenge and make a separate confirmation request. The implementation must require at minimum:

- a currently valid grant;
- a challenge cryptographically/randomly unguessable and bound server-side to the relevant grant and appropriate browser/session/context;
- short challenge expiry;
- confirmation only while the page is visible (`document.visibilityState` or equivalent);
- a small configured dwell threshold after render/visibility before confirmation;
- replay/idempotency handling so retries cannot fabricate unlimited unique views.

The server, not client-provided Quote/revision identifiers, resolves the grant binding. A confirmed signal is strong operational evidence that the rendered browser remained visibly on the Quote page for the configured threshold. It is not cryptographic proof that a particular legal person or human eyeball read the Quote.

### 8. Customer acceptance — hybrid conversion

Customer acceptance binds to the exact grant, Quote and revision and requires the offer to remain valid, unexpired, non-revoked and non-superseded. The response operation must have a durable idempotent identity so retries cannot create duplicate conversion or duplicate acceptance evidence.

The public endpoint must not expose or invoke the ADMIN controller. It enters a dedicated customer-response boundary.

If the existing canonical Quote acceptance preflight is fully satisfied, the customer-response boundary must invoke/refactor into the existing authoritative Quote acceptance/conversion service and transaction. It must not create a second acceptance engine or weaken current Customer/Property, revision, expiry, Work Order, recurring-agreement or transaction invariants.

If canonical operational conversion cannot safely complete, HestivaOS must durably preserve `CUSTOMER_ACCEPTED` evidence for that exact revision and surface the Quote for internal completion/attention. It must not mark canonical operational conversion successful, fabricate a Work Order/recurring agreement, bypass safeguards, or discard the customer's accepted response.

The later runtime design must make the two outcomes distinguishable: customer acceptance evidence can exist while operational conversion still requires internal completion.

### 9. Customer decline

Customer decline uses the same dedicated customer-response boundary. It binds to the exact valid grant/revision, is idempotent, and fails closed for stale, expired, revoked, superseded or otherwise incompatible offers.

The boundary must reuse/refactor canonical Quote decline authority rather than calling the ADMIN controller or implementing an independent decline lifecycle.

### 10. Correspondence and email

Existing Correspondence remains authoritative for immutable rendered correspondence and provider-neutral delivery-attempt history. A rendered `CorrespondenceRecord` does not prove that a message was sent.

No email provider is selected by this ADR. A future approved email adapter may create/advance Correspondence delivery attempts. `EMAIL_PROVIDER_ACCEPTED` may be recorded only when that real adapter/provider supplies evidence that the send was accepted at its boundary. Provider acceptance must not be displayed as customer read/viewed.

### 11. Manual WhatsApp delivery

The initial WhatsApp path is standard click-to-chat/deep-link preparation, independent of the paused WhatsApp Flow/PhotoPicker deployment.

HestivaOS may select and snapshot the customer mobile destination, prepare the secure Quote URL, prepare concise message text, open WhatsApp/WhatsApp Web, and append `WHATSAPP_COMPOSER_OPENED` evidence.

That action must not create a fake outbound `MessagingMessage`, mark a message sent/delivered/read, mark a Correspondence attempt accepted, or claim Meta API delivery. The staff member manually presses Send. Any future API-based Quote delivery is a separate provider-runtime decision.

### 12. Public Quote projection

A valid grant may expose only the customer-facing facts needed to understand and respond to its exact Quote revision. The minimum projection is:

- Homent/Hestiva customer-facing business identity and Quote public reference where appropriate;
- exact revision/version context without exposing internal identifiers;
- relevant service/visit scope and customer-supplied service details needed to understand the offer;
- immutable stored line items, quantities and customer-facing labels;
- stored currency, subtotal/approved adjustments/tax presentation where enabled, and total;
- Quote validity/expiry information;
- safe response state and Accept/Decline actions when actionable.

Pricing is read from the immutable canonical revision/line-item snapshot. It is never recalculated by the public web client. Customer/Property PII is minimized; internal notes, profitability/cost data, internal resolution metadata, auth identifiers, operational-only evidence and unrelated customer records are excluded unless a later explicit customer-facing contract approves them.

### 13. Public security requirements

The runtime implementation must provide:

- bounded rate limiting/abuse controls for grant resolution, view confirmation and response attempts;
- `noindex`/equivalent crawler directives and no sitemap exposure;
- caching controls appropriate for bearer-protected private customer data (default fail-safe: no-store/private rather than shared caching);
- token redaction/avoidance in application logs, telemetry, analytics, error reporting and referrer leakage where controllable;
- no third-party analytics/resources on the capability page unless proven not to leak the full capability URL;
- safe response errors that do not reveal whether arbitrary Quote/Customer/internal identifiers exist;
- server-side revalidation of expiry, revocation, supersession, exact revision and canonical Quote state on every actionable response;
- idempotent/replay-safe view and customer-response operations;
- CSRF/origin/SameSite considerations appropriate to bearer-link response endpoints, without treating Origin alone as identity proof;
- explicit customer confirmation before an irreversible Accept/Decline response is committed;
- no secrets or PII in URL query parameters or client-generated authoritative identifiers.

### 14. Event history and projections

Evidence is append-only. The Quote model must not become a collection of mutable communication timestamps such as `firstViewedAt`, `whatsappSentAt` or `emailReadAt`.

Read models/projections may derive convenient ADMIN summaries from the append-only evidence and existing Correspondence state. High-value customer responses may additionally feed `QuoteActivity`; routine view confirmations remain in the customer-access evidence history.

## Consequences

- Customer Quote access can be implemented independently of Meta business verification and without a customer account.
- Old links cannot silently mutate into newer offers.
- Staff-facing delivery/view labels have defensible evidence semantics.
- Canonical Quote acceptance safeguards and Correspondence/Messaging ownership remain intact.
- Forwarded bearer links remain a known capability property rather than being misrepresented as verified customer identity.
- Runtime implementation requires a new access/evidence persistence boundary and careful public-route security.

## Out of scope

- Database schema/migrations and concrete model names;
- public/API route names;
- customer Quote UI implementation;
- live email-provider selection/integration;
- Meta API-initiated Quote delivery;
- WhatsApp Flow/PhotoPicker deployment;
- stronger customer identity verification or electronic-signature/legal-identity claims;
- payment/accounting changes.

## Review triggers

Review this decision before introducing stronger identity/signature claims, changing bearer-capability semantics, allowing links to follow revisions, changing customer acceptance conversion invariants, adding provider-specific delivery/read semantics, or exposing materially more customer/internal data through the public projection.