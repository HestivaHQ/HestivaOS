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

The verified production signing configuration is asymmetric ECC P-256 / ES256. The API authentication guard intentionally accepts ES256 only. Do not rotate production to another JWT signing algorithm without reviewing the guard, tests, ADR-0033, recovery procedure, and deployment verification first. The public JWKS contains verification keys only; never configure or commit a Supabase private signing key in HestivaOS.

### WhatsApp Cloud API provider runtime

The direct Meta WhatsApp Business Platform adapter is inert until its provider configuration is supplied. Values are API-only unless explicitly described otherwise.

- `META_APP_SECRET` — Meta app secret used only to validate the `X-Hub-Signature-256` HMAC over exact raw webhook request bytes. Never log, commit or expose it to browser code.
- `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` — private random value chosen by Homent and configured identically in the Meta webhook subscription and Railway API runtime. It is used only for the GET subscription challenge.
- `META_WHATSAPP_ACCESS_TOKEN` — server-side access token used for authorized WhatsApp Cloud API sends. Never expose it to browser code.
- `META_WHATSAPP_PHONE_NUMBER_ID` — Meta WhatsApp business phone-number ID used as the Graph `/messages` target.
- `META_GRAPH_API_VERSION` — explicit supported Graph API version such as `vXX.X`. No repository default is supplied; production upgrades must be deliberate and reverified against current Meta documentation before changing this value.

Production onboarding also requires the corresponding Meta business portfolio, WhatsApp Business Account and registered business phone number. The WhatsApp Cloud API uses `whatsapp_business_management` and `whatsapp_business_messaging`; business-portfolio administration may additionally require `business_management` depending on the operation. Do not reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET` or any Website integration identity for messaging.

The public webhook route is `/api/v1/messaging/webhooks/whatsapp`. It intentionally bypasses Supabase user authentication because Meta provider verification is the authentication boundary: GET requires the configured verification token and POST fails closed unless the raw-body Meta signature is valid. Raw provider payload bytes are transport input only and must not be logged or durably retained.

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
