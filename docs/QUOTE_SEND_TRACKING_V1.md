# Quote Send + Tracking V1

Status: **IMPLEMENTED AND MERGED** — 2026-08-24. Reliability + Recovery V1 extends the operational recovery behavior described below.

This capability provides the ADMIN customer-delivery workspace for an immutable current Quote revision. It reuses secure customer Quote capability, `VIEW_CONFIRMED`, customer-response, Correspondence, and canonical Quote lifecycle boundaries. Resend is an outbound email transport/provider only; it is not a second Correspondence or Quote state system.

## Authority and evidence boundaries

- `Quote` + exact immutable `QuoteRevision` remain commercial authority.
- Secure Quote access remains exact-revision bearer access. A deliberately new customer delivery preparation supersedes the prior active grant; recovery of an uncertain existing email must not rotate that grant.
- Correspondence remains the durable email-template, immutable rendered-record and delivery-attempt authority.
- Resend supplies outbound transport and authenticated provider evidence only.
- `WHATSAPP_COMPOSER_OPENED` is composer-open evidence only, never sent/delivered/read evidence.
- Resend API acceptance and verified provider events are transport evidence only. `VIEW_CONFIRMED` remains the sole Quote customer-view evidence.
- `email.opened` and `email.clicked` remain ignored for Quote-view tracking.
- Customer ACCEPT/DECLINE continues through the existing append-only exact-revision response evidence and canonical `QuoteReviewService` conversion path.

## Reliability + Recovery V1

An email attempt whose synchronous Resend outcome is lost remains `PENDING_RECONCILIATION`. A second send is blocked before any new Correspondence record or secure capability is created.

ADMIN recovery uses `POST /api/v1/quotes/:id/send-share/email/reconcile` for the exact current revision. The recovery operation first inspects append-only authenticated Resend provider evidence already correlated to the original Correspondence attempt:

- `email.sent`, `email.delivered`, or `email.delivery_delayed` can safely resolve the original attempt to provider `ACCEPTED`; this is still not customer-view evidence;
- `email.failed`, `email.bounced`, `email.suppressed`, or `email.complained` can safely resolve the original attempt to `FAILED`, after which a deliberate new resend is permitted;
- no defensible provider outcome leaves the attempt genuinely unresolved and blocks a new email/capability;
- an inactive, expired, revoked or superseded original customer grant is never resurrected by recovery.

The raw secure capability is intentionally not stored and therefore cannot be reconstructed after a process boundary merely to replay an old email body. Recovery after that boundary waits for authenticated provider evidence rather than weakening the capability-storage rule. A deliberate resend after confirmed failure creates a new Correspondence record/attempt and a new exact-revision capability through the normal Send path.

The ADMIN Send / Share panel exposes a functional **Reconcile uncertain email** action only while recovery is required. It distinguishes provider accepted/sent, mail-server delivered, provider failure, genuinely uncertain, customer view, customer response and secure-access evidence without collapsing them into one status.

## Secure customer links

Customer URLs remain `<HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN>/quote#<opaque-capability>`. Raw capabilities are never written to Correspondence records, route snapshots, provider evidence, Quote activities or logs. Correspondence stores only `{{SECURE_QUOTE_LINK}}`; the bearer URL is injected in process memory at the outbound boundary.

Access-grant recovery remains fail closed: stale revision, expiry, explicit revocation and supersession remain authoritative. Recovery does not silently reactivate old access.

## Customer response recovery

Existing behavior is retained rather than replaced. `CUSTOMER_ACCEPTED`/`CUSTOMER_DECLINED` evidence is persisted before canonical operational completion. Same-decision/idempotency replay returns the existing response evidence. If acceptance conversion fails transiently, a later replay reuses that durable evidence and retries canonical `QuoteReviewService` conversion; it does not ask the customer to accept again or create a second conversion engine. Contradictory responses remain conflicts. A customer response can complete independently of incomplete email tracking.

## Resend webhook convergence

Public endpoint remains `POST /api/v1/correspondence/webhooks/resend` with raw-body Svix verification (`svix-id`, `svix-timestamp`, `svix-signature`) and the dedicated `RESEND_WEBHOOK_SIGNING_SECRET`.

Authenticated provider events remain append-only and idempotent by provider event ID. Duplicate delivery is harmless, delayed/out-of-order events retain provider occurrence time, and later evidence can safely reconcile an uncertain synchronous send. Unknown/unmatched events do not manufacture Correspondence state. Webhook arrival after an ADMIN refresh/recovery action remains evidence against the same original attempt; no Quote-view evidence is inferred.

Trusted transport events remain `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`. `email.opened` and `email.clicked` remain explicitly ignored for Quote-view semantics.

## Configuration and deployment

No new environment variable or schema migration is introduced by Reliability + Recovery V1. Existing protected Railway configuration remains:

- `RESEND_API_KEY`;
- `RESEND_WEBHOOK_SIGNING_SECRET`;
- `HESTIVA_CORRESPONDENCE_QUOTE_FROM`;
- `HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO`;
- `HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN`;
- `HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS`.

The existing Resend webhook and Quote Send + Tracking V1 deployment order remain authoritative.

## Recovery invariants

- Never classify a lost HTTP response as failure merely to enable resend.
- Never create a new capability while an earlier attempt is genuinely unresolved.
- Never resurrect revoked, superseded, expired or stale-revision access.
- Never turn `email.opened`/`email.clicked` into `VIEW_CONFIRMED`.
- Never fabricate WhatsApp send/read evidence from composer open.
- Never discard durable customer acceptance because operational conversion temporarily failed.
- Never log raw capabilities, view challenges, secrets or unnecessary customer PII.

## Out of scope

- Meta API sending of Quote links;
- automated WhatsApp sending;
- Messenger runtime;
- broad UI/UX fine-tuning;
- Accounting correspondence workflows;
- general operational notification workflows;
- inbound email reply synchronization;
- PR #214 / PhotoPicker work;
- final readiness audit.