# Resend Quote provider configuration v1

Status: feature-branch implementation, not merged or deployed.

HestivaOS reuses the existing Homent Resend account and already verified Homent sending domain. It must use its own dedicated Resend API key; the Website API key is not reused, copied or moved.

## Railway API variables

Configure values only in protected Railway API runtime configuration:

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SIGNING_SECRET`
- `HESTIVA_CORRESPONDENCE_QUOTE_FROM` = `Homent Quotes <quotes@homent.co.za>`
- `HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO` = `quotes@homent.co.za`
- `HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN` = the canonical HTTPS origin hosting the existing `/quote` customer page

The pre-existing `HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS` remains required for secure grant issuance.

## Resend dashboard actions

1. Create one new API key dedicated to HestivaOS in the existing Homent Resend account. Use the narrowest current sending permission/domain restriction available for `homent.co.za`.
2. Do not modify the Website's existing API key.
3. Add a webhook endpoint pointing to `<Railway API origin>/api/v1/correspondence/webhooks/resend`.
4. Subscribe the endpoint to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`.
5. Copy the webhook endpoint signing secret to Railway as `RESEND_WEBHOOK_SIGNING_SECRET`.
6. Do not enable `email.opened`/`email.clicked` for Quote-view tracking. Even if emitted, HestivaOS deliberately ignores them for Quote-view evidence.

## Domain and mailbox

No second Resend account, new HestivaOS sending domain or new DNS architecture is required while `homent.co.za` remains verified in the existing Homent Resend account.

`quotes@homent.co.za` must exist separately as a functioning inbound mailbox, alias or route if Homent wants customer replies to arrive there. Resend outbound domain verification does not itself create that mailbox. If the mailbox already works, no additional mailbox configuration is required for this bundle.

`accounts@homent.co.za` and `letyouknow@homent.co.za` are reserved for later purpose-specific correspondence. They are not wired into any workflow in Quote Send + Tracking V1.
