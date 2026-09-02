# Environment configuration

## Supabase authentication URLs

The Supabase Dashboard **Site URL** must be the canonical Hestiva OS production origin, and its redirect allow-list must permit that origin's `/auth/confirm` callback. These are deployment-owned settings, not repository secrets. Signup constructs `emailRedirectTo` from the active browser `window.location.origin`, so preview and production origins must be explicitly trusted in Supabase as appropriate. No Maintenance Marshall authentication URL is present in the active repository configuration; do not restore one. After changing Dashboard URL settings, verify a confirmation email lands on the intended Hestiva OS origin.

This inventory documents names only. Values must never be committed. A `NEXT_PUBLIC_` variable is embedded into browser output at **build time** and is not secret. Server/runtime variables are read by the Worker or API process at **runtime**, although a build may also require them for prerendering.

## Railway API runtime

- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `CORS_ALLOWED_ORIGINS` — comma-separated exact browser origins; surrounding whitespace and trailing slashes are normalized, while arbitrary origins remain blocked
- `SUPABASE_URL` — preferred API project URL; the API derives the public JWKS endpoint from this value for local ES256 bearer-token verification
- `SUPABASE_ANON_KEY` — retained for API features/readiness that still use the Supabase client credential; local bearer-token verification does not send this key to the JWKS endpoint
- `NEXT_PUBLIC_SUPABASE_URL` (supported API fallback for the project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (supported API fallback where existing API code requires the anonymous client credential)
- `HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS` — required positive integer maximum lifetime for newly issued secure customer Quote capabilities. The effective expiry is always the earlier of this configured lifetime and the canonical Quote `validUntil`. There is intentionally no source-code default; issuance fails closed if the value is missing or invalid.
- `HESTIVA_LAUNCH_BASELINE_RESET_ENABLED` — destructive pre-launch reset gate. Leave unset/false during ordinary operation. Set to `true` only for a deliberate LR-1 acceptance/final-reset window, then disable it again before the first real operational mutation. This value is API-only and must never be exposed through a `NEXT_PUBLIC_` variable.

### Quote email / Resend runtime

Quote Send + Tracking V1 reuses the existing Homent Resend account and verified Homent domain, but HestivaOS must have its own independently rotatable API credential. All values below are API-only Railway runtime configuration; none belongs in Cloudflare/browser variables or source control.

- `RESEND_API_KEY` — dedicated HestivaOS Resend API key. Do not reuse or move the Website key.
- `RESEND_WEBHOOK_SIGNING_SECRET` — signing secret for the HestivaOS Resend webhook endpoint; separate from the API key.
- `HESTIVA_CORRESPONDENCE_QUOTE_FROM` — Quote-purpose From identity; production value is `Homent Quotes <quotes@homent.co.za>`.
- `HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO` — Quote-purpose reply mailbox; production value is `quotes@homent.co.za`.
- `HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN` — canonical HTTPS origin only, with no path/query/fragment, that serves the existing `/quote` customer page.

The public provider callback is `POST /api/v1/correspondence/webhooks/resend`. HestivaOS verifies the exact raw request body with `svix-id`, `svix-timestamp`, and `svix-signature` before trusting provider evidence. Never log either Resend secret or the secure Quote capability. Quote bearer values are injected into outbound email only at the transport boundary and are not persisted in Correspondence snapshots, provider tags, provider-event metadata, analytics, or application logs. See `RESEND_QUOTE_PROVIDER_CONFIGURATION_V1.md` and ADR-0090.

The verified production signing configuration is asymmetric ECC P-256 / ES256. The API authentication guard intentionally accepts ES256 only. Do not rotate production to another JWT signing algorithm without reviewing the guard, tests, ADR-0033, recovery procedure, and deployment verification first. The public JWKS contains verification keys only; never configure or commit a Supabase private signing key in HestivaOS.

### WhatsApp Cloud API provider runtime

The direct Meta WhatsApp Business Platform adapter remains inert unless the required provider configuration is supplied. Values are API-only.

- `META_APP_SECRET` — Meta app secret used only to validate the `X-Hub-Signature-256` HMAC over exact raw webhook request bytes. Never log, commit or expose it to browser code.
- `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` — private random value chosen by Homent and configured identically in the Meta webhook subscription and Railway API runtime. It is used only for the GET subscription challenge.
- `META_WHATSAPP_ACCESS_TOKEN` — API-only Meta access token used for authorized WhatsApp sends.
- `META_WHATSAPP_PHONE_NUMBER_ID` — Meta phone-number ID used as the `/messages` endpoint target.
- `META_WHATSAPP_BUSINESS_ACCOUNT_ID` — Meta WhatsApp Business Account ID used by ADMIN-only WhatsApp Business management operations. Configure the WABA that owns the currently configured phone-number ID. During a test deployment it must identify the matching test WABA; changing it to production is a deliberate deployment/provider transition.
- `META_GRAPH_API_VERSION` — explicit Graph API version such as `vXX.X`; do not hard-code or silently upgrade it without current Meta verification.
- `META_WHATSAPP_QUOTE_FLOW_ID` — deployment-owned ID of the exact published Meta Flow artifact used for `HOMENT_QUOTE_REQUEST_V1`. Do not hard-code a value; configure it in the Railway API runtime only after the reviewed provider artifact exists.
- `META_WHATSAPP_QUOTE_FLOW_ENABLED` — explicit Flow-launch gate. Set to `true` only for a reviewed/published artifact that is ready for controlled or production use; unset/false keeps the guided WhatsApp Quote collector available as fallback.

Production onboarding also requires the corresponding Meta business portfolio, WhatsApp Business Account and registered business phone number. Do not reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET` or any Website integration identity for messaging.

The public webhook route is `/api/v1/messaging/webhooks/whatsapp`. It intentionally bypasses Supabase user authentication because Meta provider verification is the authentication boundary: GET requires the configured verification token and POST fails closed unless the raw-body Meta signature is valid. Raw provider payload bytes are transport input only and must not be logged or durably retained.

WhatsApp outbound is registered only when the access token, phone-number ID and explicit Graph API version are all present. Each outbound text send carries the durable HestivaOS idempotency key as Meta `biz_opaque_callback_data`, and authenticated provider status webhooks reconcile ambiguous send outcomes before another provider call is allowed. Network failures, provider 5xx responses and malformed success responses are not treated as safe-to-retry failures. If no resolving provider status arrives, HestivaOS remains fail-closed rather than blindly resending.

The ADMIN-only WhatsApp Business operations surface reuses the same server-side access token and explicit Graph API version. Listing message templates and re-checking template approval additionally require `META_WHATSAPP_BUSINESS_ACCOUNT_ID`; sending an approved template uses the configured `META_WHATSAPP_PHONE_NUMBER_ID`. Provider credentials remain server-side and are never returned to browser code.

The Quote Flow launch boundary additionally requires both Quote Flow variables above. The provider Flow ID is not a credential, but it is still deployment configuration rather than source code. Do not enable the Flow gate until Meta-side validation/publishing has completed for the intended artifact. See `WHATSAPP_QUOTE_FLOW_RUNTIME_V1.md` and `WHATSAPP_QUOTE_FLOW_NON_PHOTO_PILOT_V1.md`.

### Messenger Platform runtime

Messenger inbound uses the existing Meta app-secret authenticity boundary.

- `META_MESSENGER_WEBHOOK_VERIFY_TOKEN` — private random value chosen by Homent and configured identically in the Meta Page webhook subscription and Railway API runtime. It is used only for the GET subscription challenge.
- `META_APP_SECRET` — shared Meta app secret used to validate the Messenger POST `X-Hub-Signature-256` HMAC over the exact raw webhook request bytes.

Guarded outbound standard-window text replies additionally require:

- `META_MESSENGER_PAGE_ACCESS_TOKEN` — API-only Page access token for the configured Page. The corresponding app/Page must have the current Meta access required for customer messaging, including `pages_messaging`.
- `META_MESSENGER_PAGE_ID` — exact Facebook Page ID used as the Send API endpoint target.
- `META_GRAPH_API_VERSION` — explicit reviewed Graph API version shared with other direct Meta adapters.

The public webhook route is `/api/v1/messaging/webhooks/messenger`. Messenger outbound registers only when all three outbound values are present. HestivaOS permits only `messaging_type=RESPONSE` text replies when the same conversation contains a customer inbound message from the preceding 24 hours. It does not enable message tags, sponsored messaging, marketing, or another out-of-window policy exception. Network failures, provider 5xx responses and malformed success responses remain pending reconciliation and must not be blindly retried. See `MESSENGER_PROVIDER_EDGE_V1.md` and ADR-0082.

Do not reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET` for Messenger and never expose a Page access token to Cloudflare/browser code.

## Cloudflare Worker runtime

- `API_URL`

`apps/web/wrangler.jsonc` owns repository-declared Worker runtime configuration. Its `keep_vars: true` setting permits deliberately platform-managed runtime variables to coexist without being deleted by a later Wrangler deployment. Runtime variables do not alter an already-built browser bundle.

## Cloudflare native build

- `API_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET`
- `NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET`

Build variables must be available during the native Git build. `NEXT_PUBLIC_*` changes require a rebuild and redeploy; changing only runtime configuration will not replace values already compiled into browser assets.

The deployment validator requires the first four names in this list and fails before OpenNext builds when any is absent. It reports names only. The two bucket variables are optional because the current application supplies defaults, but production should set them when different bucket names are intended.

`NEXT_PUBLIC_*` values are intentionally browser-visible and must never contain a service-role key or another privileged credential. Platform protection prevents unauthorized configuration changes; it does not make values embedded in browser assets secret.

## GitHub Actions

GitHub Actions has no frontend deployment workflow and owns no Cloudflare production variables. The pull-request quality gate receives no production credentials and verifies without deploying.

The manual `HestivaOS Browser Audit` workflow has its own dedicated read-only diagnostic identity. Store these values only as GitHub Actions repository secrets; never commit them or reuse a normal operator's password:

- `HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL`
- `HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD`

`HESTIVA_BROWSER_AUDIT_BASE_URL` is supplied from the workflow-dispatch `base_url` input for each run rather than stored in source. The current browser audit performs read-only navigation/readiness checks only. Do not configure mutation fixtures or provider credentials into this workflow until the isolated mutation boundary documented in `OS_BROWSER_AUDIT_V1.md` exists.

## Local development

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `API_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET`
- `NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET`
- `HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS`
- `HESTIVA_LAUNCH_BASELINE_RESET_ENABLED`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SIGNING_SECRET`
- `HESTIVA_CORRESPONDENCE_QUOTE_FROM`
- `HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO`
- `HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN`

Use ignored local environment files and placeholder-only tracked examples.

## Safely recover Supabase configuration

1. Sign in to the intended Supabase organization and select the production project by its trusted account metadata, not by guessing from a URL.
2. Obtain the project URL and publishable/anonymous client credential from the project's official API settings. Obtain the database connection string from its database connection settings.
3. Store values directly in the appropriate Railway or Cloudflare protected settings. Do not paste them into issues, commits, logs, screenshots, or chat.
4. Confirm bucket **names** in Supabase Storage before configuring the two bucket variables; do not invent buckets.
5. Trigger a new Cloudflare build for build-time values, redeploy/restart Railway for API runtime values, then validate authentication, an API read, and storage access.
6. Rotate any credential that may have been exposed and review platform audit logs.

## Phase 3B protected temporary access

- `TEMPORARY_ACCESS_CREDENTIAL_ENCRYPTION_KEY` — API-only, required when protected text is written or revealed; base64 encoding of exactly 32 random bytes. Acquire and rotate it through the approved deployment secret manager. Never prefix it with `NEXT_PUBLIC_`, log it, or commit a value. Rotation requires a controlled re-encryption procedure because existing ciphertext remains bound to the prior key.

## Private Execution Evidence access (2026-08-19)

- `SUPABASE_SERVICE_ROLE_KEY` — API-only credential used solely after application authorization to sign private Execution Evidence reads; acquire and rotate it in Supabase project API settings and the Railway secret manager. Never log, commit, expose to Cloudflare/Next.js, or prefix with `NEXT_PUBLIC_`.
- `SUPABASE_WORK_ORDER_PHOTOS_BUCKET` — API-side bucket name for signed Execution Evidence reads; defaults to `work-order-photos` and must identify the same private bucket used by capture uploads.

The bucket must not permit anonymous/public reads. `SUPABASE_URL` remains the project URL used by authentication and signing.
