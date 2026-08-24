# Quote Send + Tracking V1 verification matrix

This matrix defines the required verification for the feature branch before merge. It supplements `QUOTE_SEND_TRACKING_V1.md`; it does not replace the repository PR quality gates.

## API/provider boundary

- Quote email resolves purpose `QUOTE` to the configured `Homent Quotes <quotes@homent.co.za>` sender and `quotes@homent.co.za` reply address.
- Resend API requests use a dedicated runtime API key, a Correspondence-attempt idempotency key and a non-secret Correspondence-attempt tag.
- Explicit Resend acceptance is recorded as provider acceptance only.
- Explicit provider rejection becomes a failed delivery-attempt outcome.
- Network ambiguity remains pending until provider evidence can reconcile the attempt; it is not blindly retried.
- Secure Quote capability values appear only in the in-memory outbound email body/composer URL and are absent from durable Correspondence records/provenance/routes and Quote activity metadata.

## Webhook security/evidence

- Missing/invalid signature fails before provider evidence is trusted.
- Stale timestamp fails the replay window.
- Duplicate `svix-id` is idempotent.
- Signed `correspondence_attempt` tag can correlate an event even when the original HTTP response was lost.
- `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed` are stored as provider evidence.
- `email.opened` and `email.clicked` do not become Quote view evidence.

## Quote lifecycle

- Only current exact-revision `SUBMITTED` Quotes can be prepared for customer delivery.
- New delivery preparation issues a new grant and supersedes the prior active grant through the existing customer-access service.
- Old/superseded links fail closed through the existing access resolver.
- Customer ACCEPT/DECLINE continues through existing exact-revision response logic.
- Provider acceptance/delivery does not change Quote response state.

## ADMIN UI

- Send / Share displays the current revision and customer email/mobile.
- Email send and explicit resend are human initiated.
- WhatsApp action opens a prefilled click-to-chat composer; staff still press Send.
- UI states distinguish Resend accepted/sent/delivered/failure from secure Quote `VIEW_CONFIRMED`.
- UI shows customer response separately from transport evidence.

## Authoritative final validation

The frozen final head must pass all jobs in `.github/workflows/pr-quality-gates.yml`:

- Validate policy, secrets and diff;
- Validate API;
- Validate web and Cloudflare bundle;
- Replay PostgreSQL migrations.

Any branch change after a green run invalidates that exact-head result and requires another full run.
