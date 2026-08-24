# Quote Send + Tracking V1

Status: **IMPLEMENTED ON FEATURE BRANCH — NOT YET MERGED/DEPLOYED** — 2026-08-24.

This bundle adds the ADMIN customer-delivery workspace for an immutable current Quote revision. It reuses the existing secure customer Quote capability, `VIEW_CONFIRMED`, customer-response, Correspondence, and canonical Quote lifecycle boundaries. Resend is an outbound email transport/provider only; it is not a second Correspondence or Quote state system.

## Authority and evidence boundaries

- `Quote` + exact immutable `QuoteRevision` remain commercial authority.
- Existing secure Quote access remains exact-revision bearer access. Issuing a new customer delivery capability supersedes the prior active grant; an old link does not follow later pricing or a newly prepared send.
- Existing Correspondence remains the durable email-template, immutable rendered-record and delivery-attempt authority.
- Resend is used only to submit outbound email and provide authenticated provider events.
- `WHATSAPP_COMPOSER_OPENED` means only that an ADMIN explicitly requested the prefilled WhatsApp click-to-chat composer. It is not sent, delivered or read evidence.
- Resend API acceptance means only that Resend accepted the request and supplied its email ID. It is not delivery and never means the customer viewed the Quote.
- Verified Resend `email.delivered` is recipient-mail-server delivery evidence according to the provider contract. It is not customer-view evidence.
- Secure Quote `VIEW_CONFIRMED` remains the sole operational customer-view evidence in this bundle.
- Resend `email.opened` and `email.clicked` events are deliberately ignored for Quote-view tracking and are not stored by this provider evidence ingester.
- Customer ACCEPT/DECLINE continues to use the existing secure exact-revision response evidence and canonical Quote conversion path.

## ADMIN experience

The ADMIN Quote detail page now includes a **Send / Share** panel for the current revision.

For a `SUBMITTED` Quote, ADMIN can:

1. send the current revision by email;
2. open a prefilled manual WhatsApp composer;
3. refresh current delivery/view/response evidence.

The panel shows separate evidence for:

- Resend/Correspondence email state;
- WhatsApp composer-open evidence;
- secure Quote view count/first/latest confirmed view;
- customer ACCEPT/DECLINE response;
- current secure-access state.

Terminal/non-actionable Quotes do not expose an active Send button for a new customer offer.

## Secure customer links

Every outbound preparation uses `QuoteCustomerAccessService.issue()` for the exact expected current revision. The existing service serializes grant issuance and supersedes the prior active grant.

Customer URLs use the existing browser-fragment transport:

`<HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN>/quote#<opaque-capability>`

The raw capability is never written to Correspondence records, delivery route snapshots, Quote activities, webhook evidence or logs by this bundle. Correspondence stores only the safe `{{SECURE_QUOTE_LINK}}` marker. The actual bearer URL is injected in process memory immediately before the Resend request or WhatsApp composer URL is returned to the initiating ADMIN browser.

## Quote email

The seeded published Correspondence template is `quote_customer_ready_v1`.

It intentionally contains only a concise notification and the secure-link marker rather than duplicating sensitive Quote details. Current Quote correspondence uses purpose `QUOTE` and resolves its sender at the transport boundary.

Configured sender:

`Homent Quotes <quotes@homent.co.za>`

Configured reply address:

`quotes@homent.co.za`

The sender is not a global application constant. `CorrespondenceSenderResolver` resolves by correspondence purpose. Only `QUOTE` is implemented in this bundle. Future categories can add their own sender mapping without changing the Resend transport contract:

- `ACCOUNTING` → `accounts@homent.co.za` — not implemented here;
- general operational → `letyouknow@homent.co.za` — not implemented here.

No Accounting or general operational correspondence workflow is added by this bundle.

## Resend send adapter

`ResendEmailTransport` calls `POST https://api.resend.com/emails` directly from the API runtime using the dedicated HestivaOS `RESEND_API_KEY`.

Each immutable Correspondence delivery attempt supplies the Resend idempotency key:

`correspondence-attempt/<attempt-uuid>`

Outcomes are treated conservatively:

- HTTP success plus a valid Resend email ID → Correspondence terminal `ACCEPTED` with that provider reference;
- explicit non-success provider response → Correspondence terminal `FAILED` with provider rejection evidence;
- network failure before a trustworthy response → attempt remains `PENDING`, surfaced as `PENDING_RECONCILIATION`; HestivaOS does not blindly resend;
- malformed nominal success → fail closed as an upstream error rather than fabricating provider acceptance.

A new UI resend is a new customer delivery preparation and therefore rotates the secure Quote capability. It is not an automatic replay of an uncertain provider call.

## Resend webhook authenticity

Public endpoint:

`POST /api/v1/correspondence/webhooks/resend`

The endpoint uses the Nest raw request body and requires all current Svix/Resend signature headers:

- `svix-id`;
- `svix-timestamp`;
- `svix-signature`.

It verifies HMAC-SHA256 over the exact raw-body signing payload using the dedicated `RESEND_WEBHOOK_SIGNING_SECRET`. Signature comparison is timing-safe and webhook timestamps outside the bounded five-minute replay window are rejected.

The API key and webhook signing secret are separate credentials. Neither belongs in source control, browser code, logs, issues or screenshots.

Authenticated provider events are idempotently stored by `svix-id` in `correspondence_provider_events` and linked only to an existing Correspondence attempt whose provider reference matches Resend `data.email_id`. Unknown/unmatched events do not manufacture Correspondence state.

Resend webhook delivery is treated as potentially duplicated and out of order. HestivaOS therefore keeps append-only provider-event evidence and uses provider event occurrence timestamps rather than assuming arrival order.

## Trusted Resend provider events

The provider ingester accepts these authenticated transport/lifecycle events as evidence:

- `email.sent` — Resend reports the email was sent onward;
- `email.delivered` — provider reports delivery to the recipient mail server;
- `email.delivery_delayed` — provider reports delivery delay;
- `email.bounced` — provider reports bounce;
- `email.complained` — provider reports spam complaint;
- `email.failed` — provider reports failure;
- `email.suppressed` — provider reports suppression.

`email.opened` and `email.clicked` are explicitly ignored for this Quote workflow. They never become Quote `VIEW_CONFIRMED`.

The synchronous Resend API response is the evidence used for initial provider acceptance. A later webhook does not rewrite the immutable Correspondence record; it appends provider evidence against the delivery attempt.

## Railway API environment variables

Configure these values in the protected HestivaOS Railway API runtime:

- `RESEND_API_KEY` — a newly created **HestivaOS-only** API key in the existing Homent Resend account. Do not reuse the website key.
- `RESEND_WEBHOOK_SIGNING_SECRET` — signing secret for the HestivaOS Resend webhook endpoint; separate from the API key.
- `HESTIVA_CORRESPONDENCE_QUOTE_FROM` — `Homent Quotes <quotes@homent.co.za>`.
- `HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO` — `quotes@homent.co.za`.
- `HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN` — canonical HTTPS HestivaOS customer-page origin, without a trailing `/`.

The pre-existing `HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS` remains required by secure capability issuance.

## Manual Resend/account actions before production use

1. In the **existing Homent Resend account**, create a dedicated API key for HestivaOS. Use the narrowest sending scope/domain restriction Resend currently permits for the Homent sending domain. Store only its value in Railway `RESEND_API_KEY`.
2. Do not delete, move or reuse the website API key.
3. Create a Resend webhook endpoint targeting the public Railway API URL plus `/api/v1/correspondence/webhooks/resend`.
4. Subscribe that endpoint to the transport events listed above. Quote open/click tracking is not required for this workflow.
5. Copy that endpoint's signing secret into Railway as `RESEND_WEBHOOK_SIGNING_SECRET`.
6. Confirm the existing `homent.co.za` Resend domain remains verified and permits `quotes@homent.co.za` as a sender.
7. Perform one controlled production-like Quote email test, confirm Resend API acceptance, confirm a signed provider event reaches HestivaOS, and confirm the customer secure page records `VIEW_CONFIRMED` only after a genuine visible visit.

## DNS and mailbox requirements

No new Resend account or new sending domain is required. Under the approved assumption that `homent.co.za` is already verified in the same Resend account, this bundle requires **no new DNS records merely because HestivaOS is a separate application**. If the existing Resend dashboard shows the domain as unverified, fix that existing-domain verification rather than creating a second HestivaOS domain architecture.

Sending from a verified domain does not itself create a mailbox. Because customer replies are intended to belong to Quote correspondence, `quotes@homent.co.za` must exist as a working mailbox, alias or mail-routing destination in Homent's inbound email provider. If it already receives mail, no additional mailbox action is required. Resend inbound-email routing is not required merely to use `quotes@homent.co.za` as the outbound From/Reply-To address.

## Recovery and edge cases

- **Quote changes before action:** exact expected-revision checks fail with conflict; ADMIN must reload the current revision.
- **New send/share preparation:** new grant supersedes the prior active grant. Older links fail closed.
- **Explicit provider rejection:** attempt is terminal `FAILED`; a later operator resend creates a fresh Correspondence record/attempt and secure grant.
- **Network/ambiguous send outcome:** attempt remains pending reconciliation and the UI warns against blind resend.
- **Duplicate/out-of-order provider webhook:** provider event ID dedupe and occurrence timestamps preserve truthful evidence without assuming delivery order.
- **Webhook for unknown Resend email ID:** accepted as unmatched transport input but does not mutate a Quote or Correspondence attempt.
- **Provider open/click events:** ignored for Quote view semantics.
- **Missing sender/API/webhook configuration:** email transport/webhook fails closed rather than falling back to another mailbox or credential.
- **WhatsApp popup/composer:** HestivaOS records only `WHATSAPP_COMPOSER_OPENED`; staff still manually press Send in WhatsApp/WhatsApp Web.
- **Customer response:** existing append-only exact-revision response evidence remains authoritative; delivery transport does not modify it.

## Out of scope

- Meta API sending of Quote links;
- claiming WhatsApp sent/delivered/read status from a manual composer;
- email tracking pixels as Quote-view evidence;
- Accounting correspondence workflows;
- general operational notification workflows;
- inbound email ingestion/reply synchronization into HestivaOS;
- PR #214 or Messaging media-bridge changes.
