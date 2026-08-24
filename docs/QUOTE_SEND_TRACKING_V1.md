# Quote Send + Tracking V1

Status: **IMPLEMENTED / MERGED THROUGH PR #225** — 2026-08-24. Reliability + Recovery V1 extends the operational recovery behavior without redesigning the authority boundaries below.

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

The ADMIN Quote detail page includes a **Send / Share** panel for the current revision.

For a `SUBMITTED` Quote, ADMIN can:

1. send the current revision by email;
2. open a prefilled manual WhatsApp composer;
3. refresh current delivery/view/response evidence;
4. reconcile an existing email attempt whose synchronous provider outcome remains uncertain.

The panel shows separate evidence for:

- Resend/Correspondence email state;
- WhatsApp composer-open evidence;
- secure Quote view count/first/latest confirmed view;
- customer ACCEPT/DECLINE response;
- current secure-access state;
- bounded recovery state when an email outcome is genuinely uncertain.

Terminal/non-actionable Quotes do not expose an active Send button for a new customer offer.

## Secure customer links

Every outbound preparation uses `QuoteCustomerAccessService.issue()` for the exact expected current revision. The existing service serializes grant issuance and supersedes the prior active grant.

Customer URLs use the existing browser-fragment transport:

`<HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN>/quote#<opaque-capability>`

The raw capability is never written to Correspondence records, delivery route snapshots, Quote activities, webhook evidence or logs by this bundle. Correspondence stores only the safe `{{SECURE_QUOTE_LINK}}` marker. The actual bearer URL is injected in process memory immediately before the Resend request or WhatsApp composer URL is returned to the initiating ADMIN browser.

Reliability recovery does not weaken that rule. A raw capability is intentionally unrecoverable from persistent storage after the original process request is gone, so recovery must not reconstruct or log it merely to replay an uncertain email.

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

Reliability + Recovery preserves the original attempt while it is uncertain. A second email/capability is blocked until the original attempt is defensibly reconciled. Resend idempotency remains part of the transport contract, but the OS does not fabricate an exact replay after a process boundary because the raw bearer link is correctly non-persistent.

## Resend webhook authenticity

Public endpoint:

`POST /api/v1/correspondence/webhooks/resend`

The endpoint uses the Nest raw request body and requires all current Svix/Resend signature headers:

- `svix-id`;
- `svix-timestamp`;
- `svix-signature`.

It verifies HMAC-SHA256 over the exact raw-body signing payload using the dedicated `RESEND_WEBHOOK_SIGNING_SECRET`. Signature comparison is timing-safe and webhook timestamps outside the bounded five-minute replay window are rejected.

The API key and webhook signing secret are separate credentials. Neither belongs in source control, browser code, logs, issues or screenshots.

Authenticated provider events are idempotently stored by `svix-id` in `correspondence_provider_events` and linked only to an existing Quote Correspondence attempt using the signed attempt tag and/or matching provider reference. Unknown/unmatched events do not manufacture Correspondence state.

Resend webhook delivery is treated as potentially duplicated, delayed and out of order. HestivaOS therefore keeps append-only provider-event evidence and uses provider event occurrence timestamps rather than assuming arrival order.

## Trusted Resend provider events

The provider ingester accepts these authenticated transport/lifecycle events as evidence:

- `email.sent` — Resend reports the API request was successful and it will attempt recipient-mail-server delivery;
- `email.delivered` — provider reports delivery to the recipient mail server;
- `email.delivery_delayed` — provider reports a temporary delivery problem after processing the submission;
- `email.bounced` — recipient mail server permanently rejected delivery;
- `email.complained` — the email was delivered and later marked as spam;
- `email.failed` — provider reports the email failed to send;
- `email.suppressed` — provider suppressed the email before delivery.

`email.opened` and `email.clicked` are explicitly ignored for this Quote workflow. They never become Quote `VIEW_CONFIRMED`.

The synchronous Resend API response is the evidence used for initial provider acceptance. A later webhook does not rewrite the immutable Correspondence record; it appends provider evidence against the delivery attempt.

When the synchronous HTTP outcome was lost and the attempt therefore remained `PENDING`, recovery may use later authenticated provider evidence to finish the original Correspondence attempt truthfully. `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced` and `email.complained` all prove that Resend accepted/processed the original submission; downstream bounce/complaint semantics remain visible as provider lifecycle evidence and are not misreported as API rejection. `email.failed` and `email.suppressed` can resolve an otherwise uncertain submission to failed provider submission when no stronger acceptance evidence exists.

## Railway API environment variables

Configure these values in the protected HestivaOS Railway API runtime:

- `RESEND_API_KEY` — a newly created **HestivaOS-only** API key in the existing Homent Resend account. Do not reuse the website key.
- `RESEND_WEBHOOK_SIGNING_SECRET` — signing secret for the HestivaOS Resend webhook endpoint; separate from the API key.
- `HESTIVA_CORRESPONDENCE_QUOTE_FROM` — `Homent Quotes <quotes@homent.co.za>`.
- `HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO` — `quotes@homent.co.za`.
- `HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN` — canonical HTTPS HestivaOS customer-page origin, without a trailing `/`.

The pre-existing `HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS` remains required by secure capability issuance.

Reliability + Recovery V1 adds no new environment variable and no new provider credential.

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

## Reliability + Recovery V1

### Uncertain email reconciliation

`POST /api/v1/quotes/:id/send-share/email/reconcile` is ADMIN-only and exact-revision-bound. It operates only on an existing Quote email attempt that still has `PENDING` evidence and no terminal Correspondence delivery outcome.

The recovery order is:

1. revalidate the current Quote/revision and normal customer-offer eligibility;
2. locate the original pending Resend attempt without creating another Correspondence record or capability;
3. inspect authenticated, append-only Resend provider events already correlated to that exact attempt;
4. if provider processing/acceptance is proven, record the original Correspondence attempt `ACCEPTED` without creating a new link;
5. if provider submission failure is proven, record the original attempt `FAILED`, after which a deliberate fresh resend is allowed;
6. if neither is proven, verify that the original exact-revision customer grant remains active and keep the attempt unresolved;
7. if the original grant is revoked, superseded, expired or otherwise inactive, fail closed rather than resurrecting it.

An unresolved outcome therefore remains visible as a real recovery state rather than being silently converted into success or failure.

### Safe resend behavior

A normal new resend is blocked while the previous attempt is unresolved. Once recovery gives the prior attempt a defensible terminal outcome, any later deliberate resend uses the ordinary Send path and therefore creates a new Correspondence delivery preparation and new exact-revision customer capability. It does not mutate or reuse a revoked/superseded/stale grant.

### Webhook convergence

Duplicate `svix-id` deliveries are idempotent. Delayed and out-of-order provider events remain append-only with provider occurrence timestamps. A webhook may arrive before or after the ADMIN opens the recovery view; it still correlates to the same attempt and can provide the evidence used by the next reconciliation action. Provider open/click events remain excluded from Quote customer-view evidence.

### Customer-response recovery

Existing customer-response behavior is intentionally reused rather than rebuilt. `CUSTOMER_ACCEPTED`/`CUSTOMER_DECLINED` evidence is persisted independently of operational completion. A same-decision/idempotency replay recovers the existing decision. When canonical acceptance conversion temporarily fails, later safe replay reuses the existing acceptance evidence and canonical `QuoteReviewService`; the customer does not need to accept again. Contradictory decisions remain conflicts. Customer acceptance can complete even while email transport tracking is incomplete.

### ADMIN recovery presentation

The Send / Share panel scopes provider lifecycle text to the latest email attempt rather than allowing an older attempt's event to overwrite the latest attempt's state. The UI distinguishes:

- provider accepted/sent;
- recipient-mail-server delivered;
- delayed;
- bounced;
- complaint;
- provider submission failed;
- genuinely uncertain;
- awaiting customer view / customer viewed;
- accepted / declined;
- secure access state.

These labels remain evidence-specific and do not create new Quote statuses.

## Recovery and edge cases

- **Quote changes before action:** exact expected-revision checks fail with conflict; ADMIN must reload the current revision.
- **New send/share preparation:** new grant supersedes the prior active grant. Older links fail closed.
- **Explicit provider rejection:** attempt is terminal `FAILED`; a later operator resend creates a fresh Correspondence record/attempt and secure grant.
- **Network/ambiguous send outcome:** attempt remains pending reconciliation and the UI blocks blind resend until it is reconciled.
- **Authenticated provider evidence after lost HTTP response:** reconciliation finishes the original Correspondence attempt; it does not create another link.
- **No authenticated provider evidence yet:** the original attempt remains unresolved and its active secure grant is preserved.
- **Original grant no longer active during recovery:** recovery fails closed and never resurrects the link.
- **Duplicate/out-of-order provider webhook:** provider event ID dedupe and occurrence timestamps preserve truthful evidence without assuming arrival order.
- **Webhook for unknown Resend email ID/attempt:** accepted as unmatched transport input but does not mutate a Quote or Correspondence attempt.
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
- broad UI/UX visual fine-tuning;
- final readiness audit;
- PR #214 or Messaging media-bridge changes.
