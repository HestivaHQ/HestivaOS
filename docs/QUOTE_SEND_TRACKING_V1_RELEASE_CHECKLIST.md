# Quote Send + Tracking V1 release checklist

Before production enablement:

- apply migration `20260824150000_quote_send_tracking_v1`;
- configure the dedicated HestivaOS Resend API key and separate webhook signing secret in Railway;
- configure the Quote From/Reply-To and canonical secure customer-page origin;
- configure the Resend webhook endpoint and subscribed transport events;
- confirm `homent.co.za` remains verified in the existing Resend account;
- confirm `quotes@homent.co.za` receives replies;
- run a controlled Quote email send and verify Resend acceptance evidence;
- verify at least one signed provider lifecycle event is persisted;
- verify opening the secure Quote page creates `VIEW_CONFIRMED` only through the existing visible-page challenge protocol;
- verify manual WhatsApp preparation records only `WHATSAPP_COMPOSER_OPENED` and staff still press Send;
- verify a new send/share preparation supersedes the prior secure link;
- require the full exact-head PR quality gates before merge.
