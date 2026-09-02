# Deployment

## 2026-09-02 Launch Baseline Reset V1

Deploy the LR-1A API/web revision with `HESTIVA_LAUNCH_BASELINE_RESET_ENABLED` absent or set to `false`. The launch-baseline reset is a pre-launch destructive boundary, not an ordinary production ADMIN feature. Its API-only runtime switch must never be exposed to Cloudflare/browser code.

For an approved LR-1B acceptance/reset window, first confirm the deployed revision matches the reviewed commit, the normal readiness endpoint is healthy, and no real operational records have begun. Then set Railway API `HESTIVA_LAUNCH_BASELINE_RESET_ENABLED=true` and restart/redeploy the API. In Admin Settings, load the reset impact preview before any destructive action. The preview must account for every public table, exact classified row counts and known private operational Storage paths. An unclassified table, unresolved Quote-photo Storage path, or other blocker means **do not reset**; reconcile the ownership gap in code/documentation first.

Execution requires the exact confirmation phrase shown by the OS and the exact current impact fingerprint. Never call the endpoint with hand-built SQL/table/path input; the API accepts no such authority. After execution, require the API's post-reset verification to report a clean baseline and independently confirm the intended preserved configuration/Users remain. The reset does not reverse already-sent email, WhatsApp or Messenger provider traffic, so acceptance runs must use controlled recipients/provider-safe boundaries.

Immediately after the verified reset, remove `HESTIVA_LAUNCH_BASELINE_RESET_ENABLED` (or set it to `false`) and restart/redeploy the API. Verify the impact preview now reports the runtime gate disabled and that execution is rejected. Do not leave the switch enabled when normal production operations begin. No database migration is introduced by LR-1A. See `LAUNCH_BASELINE_RESET_V1.md` and ADR-0092.

## 2026-08-24 Quote Send + Tracking V1

Deploy additive migration `20260824150000_quote_send_tracking_v1` through the normal Railway `npm run deploy:api` path before enabling the Quote Send / Share controls. The migration extends the existing customer-engagement evidence vocabulary with truthful `WHATSAPP_COMPOSER_OPENED` evidence, adds append-only `correspondence_provider_events`, and publishes the `quote_customer_ready_v1` Correspondence template. It does not create a second Quote, Messaging, email, or customer-view authority.

Before deploying the matching API revision, configure Railway API runtime variables `RESEND_API_KEY`, `RESEND_WEBHOOK_SIGNING_SECRET`, `HESTIVA_CORRESPONDENCE_QUOTE_FROM`, `HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO`, and `HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN`; retain the existing required `HESTIVA_QUOTE_CUSTOMER_LINK_MAX_LIFETIME_SECONDS`. `RESEND_API_KEY` must be the dedicated HestivaOS key from the existing Homent Resend account rather than the Website key. The Quote sender purpose resolves to `Homent Quotes <quotes@homent.co.za>` with `quotes@homent.co.za` as the reply address. Do not commit or log either Resend credential, and never expose them to Cloudflare/browser code.

Configure the Resend webhook endpoint to POST to `/api/v1/correspondence/webhooks/resend`. HestivaOS verifies the **raw request body** with `svix-id`, `svix-timestamp`, and `svix-signature` using the separate webhook signing secret before trusting any provider event. The provider evidence accepted by this V1 boundary is `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, and `email.suppressed`; provider webhook IDs are idempotency identities and event timestamps are evidence timestamps. `email.opened` and `email.clicked` are deliberately ignored for Quote-view semantics. `email.sent`/provider acceptance and `email.delivered` remain email-transport evidence only and must never become customer `VIEW_CONFIRMED`.

Every actual Quote send/share preparation issues the secure capability through the existing exact-revision access-grant authority. The raw capability is injected only in memory into the customer URL `${HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN}/quote#<opaque-capability>` and must not be stored in Correspondence snapshots, provider tags/events, logs, analytics, or database evidence. A later issuance supersedes the previous active grant, so an old link never follows newer pricing. Manual WhatsApp delivery opens a prefilled composer and may record only `WHATSAPP_COMPOSER_OPENED`; it does not create a fake outbound `MessagingMessage` and does not prove sent, delivered, or read.

After deployment, require `/api/v1/ready` to remain healthy, verify the Quote sender configuration resolves, send one disposable Quote email and require one authoritative Correspondence delivery attempt plus Resend provider evidence, then replay a signed webhook and require no duplicate provider event. Verify a disposable customer link opens the exact revision, creates `VIEW_CONFIRMED` only through the existing browser challenge/dwell flow, and that provider `email.opened`/`email.clicked` cannot create a view. Open one WhatsApp share and confirm only composer-open evidence is recorded until the customer actually opens the secure Quote. Reissue/resend the same Quote only after the prior provider outcome is reconciled; an ambiguous network/provider outcome remains pending reconciliation and blocks a new email/capability rather than minting a conflicting retry identity.

Application rollback should retain the additive migration, Correspondence history, provider evidence, engagement evidence, and access grants. A prior application may ignore the new rows, but do not delete them to simulate rollback. If Resend transport must be disabled, remove the HestivaOS `RESEND_API_KEY` from Railway and redeploy/restart the API; preserve the webhook secret and historical evidence as needed for already-issued provider events. Do not rotate or revoke the Website's separate Resend key as part of HestivaOS rollback. See `QUOTE_SEND_TRACKING_V1.md`, `RESEND_QUOTE_PROVIDER_CONFIGURATION_V1.md`, and ADR-0090.

## 2026-08-20 Messenger guarded outbound replies

Deploy the API revision only after the existing Messenger inbound webhook is healthy and the Page/app has the current Meta access required for customer messaging. Configure API-only `META_MESSENGER_PAGE_ACCESS_TOKEN`, `META_MESSENGER_PAGE_ID`, and the already reviewed explicit `META_GRAPH_API_VERSION` in Railway. The Page access token must belong to the intended Page/app configuration with the required Messenger permission such as `pages_messaging`; do not expose the token to Cloudflare/browser code and do not infer provider approval merely because a token value exists.

Outbound v1 is deliberately limited to `messaging_type=RESPONSE` text replies. Before every provider call HestivaOS requires the same durable Messenger conversation to contain a customer inbound message from the preceding 24 hours. A conversation outside that window is not offered as an outbound channel. Message tags, sponsored messaging, marketing, and other out-of-window exceptions are not enabled.

After deployment, require `/api/v1/ready` to remain healthy, confirm Messenger inbound verification still succeeds, then use a disposable customer/test profile that has messaged the Page within the last 24 hours. Trigger one authorized HestivaOS reply and require exactly one Meta provider message ID/accepted local state. Verify a fixture/conversation whose latest inbound message is older than 24 hours is not offered for sending and fails before a provider request. Do not deliberately create provider ambiguity in production; if a network/provider 5xx or malformed success response occurs naturally, leave the durable message pending reconciliation and do not resend it manually with a new identity.

No database migration is introduced. To disable Messenger outbound without disabling inbound receipt, remove `META_MESSENGER_PAGE_ACCESS_TOKEN` or `META_MESSENGER_PAGE_ID` from Railway and restart/redeploy the API; the adapter will stop registering as an outbound transport while webhook verification continues through `META_APP_SECRET` and `META_MESSENGER_WEBHOOK_VERIFY_TOKEN`. A full application rollback may deploy the prior API revision. See `MESSENGER_PROVIDER_EDGE_V1.md` and ADR-0082.

## 2026-08-20 Messenger receive-only provider edge

Deploy the API revision after configuring the API-only `META_MESSENGER_WEBHOOK_VERIFY_TOKEN` in Railway and the identical verify token in the Meta Page webhook subscription. The existing `META_APP_SECRET` remains the raw-body `X-Hub-Signature-256` verification key. Do not reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET`, and do not expose either value to Cloudflare/browser code.

The public callback is `/api/v1/messaging/webhooks/messenger`. GET must return the Meta challenge only for `hub.mode=subscribe` plus the matching verification token. POST must reject missing raw body, missing app-secret configuration, malformed signatures, and invalid HMAC before normalizing or persisting any event. A successful disposable Page message should create exactly one immutable `MESSENGER` message on repeated delivery of the same provider event.

This revision is deliberately receive-only. No Page access token is required or accepted by this slice, Messenger is not registered as an outbound-capable adapter, and `send()` fails closed. Do not enable customer-facing Messenger sends until a later reviewed slice records the applicable Page-token/permission and messaging-window requirements plus duplicate-safe reconciliation for ambiguous Send API outcomes. See `MESSENGER_PROVIDER_EDGE_V1.md`.

## 2026-08-20 WhatsApp inbound media storage

Deploy additive migration `20260820191500_whatsapp_inbound_media_assets` through the normal Railway `npm run deploy:api` path before enabling inbound WhatsApp media handling. Before the matching API revision receives media traffic, create a **private** Supabase Storage bucket named `messaging-media`. Do not make that bucket public and do not expose `SUPABASE_SERVICE_ROLE_KEY` to Cloudflare/browser code.

The runtime reuses existing API-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, and `META_GRAPH_API_VERSION`; no new environment variable is introduced. Authenticated inbound media is persisted first as immutable messaging history, then retrieved from Meta and secured in the private bucket under a deterministic message/media path. Provider-declared media above the fixed 20 MB v1 limit fails closed.

After deployment, verify the migration completed, `/api/v1/ready` remains healthy, the bucket is private, and one disposable inbound WhatsApp image under 20 MB produces one immutable message plus one `STORED` row in `messaging_media_assets`. Replay the same webhook/provider event and require no second logical message or asset. Application rollback should retain the additive media table and private objects; a prior API can ignore them. See `WHATSAPP_INBOUND_MEDIA_STORAGE_V1.md` and ADR-0081.

## 2026-08-19 administrative access-audit migration

Deploy additive migration `20260819230000_admin_access_audit_history` through the normal Railway `npm run deploy:api` path before the API revision that writes or reads administrative access-audit history. The migration creates only the `user_access_changes` table and its indexes. It does not rewrite existing User records or require any new runtime configuration.

After deployment, verify Prisma reports the migration finished, the API readiness endpoint remains healthy, and the audit table/indexes exist. Application rollback should retain the additive table and previously recorded audit evidence; an older API can ignore the table. See `ADMIN_ACCESS_AUDIT_HISTORY_V1.md` and `RECOVERY_GUIDE.md` for behavioral verification and incident handling.

## 2026-08-19 three-stage validation and PR CI topology

Pull requests targeting `main` use the non-deploying four-job topology recorded in ADR-0067: **Validate policy, secrets and diff**, **Validate API**, **Validate web and Cloudflare bundle**, and **Replay PostgreSQL migrations**. The jobs are independent and run in parallel. Policy validation needs full Git history but no dependency install; API and web each perform a locked root `npm ci`/Prisma bootstrap before their workspace checks; PostgreSQL replay retains its isolated clean and staged databases. Every final job remains required and there is no changed-file path shortcut for merge validation.

The API job runs the API workspace typecheck, full Jest suite and Nest production build. The web job runs web typecheck/tests, Cloudflare type generation, the OpenNext Worker build and Wrangler `--dry-run`. OpenNext invokes the production Next.js build itself, so the former root build plus repeated standalone API/web builds are not run in addition to these dedicated jobs. This removes duplicate compilation while preserving the meaningful production/package checks. The policy job runs `scripts/validate_documentation.py`, the tracked-file secret scan and `git diff --check`; meaningful implementation diffs must include both `docs/CHANGELOG.md` and `docs/TECHNICAL_WORK_LOG.md` as a minimum automated documentation boundary, while `AGENTS.md` still owns the full matrix.

During active development, use the proportional Stage 1 checks in `AGENTS.md`; do not repeatedly reproduce this complete final suite merely because the branch is still changing. Before authoritative CI, finish all required documentation/coordination and complete-diff reconciliation, then freeze the exact head. Immediately before merge, repeat the current-main, parallel-PR, append-only-history, canonical-documentation, mergeability and exact-tested-head review. A failed gate or later evidence-driven finding reopens the same scoped branch for the smallest justified fix and requires a new complete exact-head run.

This section supersedes older pull-request-verification command descriptions later in this document where they describe the pre-ADR-0067 sequential `Verify repository` job. Those older paragraphs are retained as historical deployment context only. This workflow change introduces no production credential, environment variable, runtime service, database migration or deployment authority. Rollback is therefore a repository-workflow rollback: restore the prior Actions/validator/instruction files on a reviewed branch and rerun the then-current required PR gates; do not change Cloudflare, Railway or Supabase runtime configuration merely to roll back CI orchestration.

## 2026-08-19 recurring automatic resume migration and runner

Deploy additive migration `20260819223000_recurring_auto_resume` through the normal Railway `npm run deploy:api` path before the API/web revision that exposes automatic resume. The migration adds only nullable `recurring_service_agreements.auto_resume_date` plus the `(status, auto_resume_date)` index. Existing agreements retain null and their current lifecycle state; no Work Order, recurrence, Customer, Property, Quote, correspondence, Messaging, Finance, or Needs Attention data is rewritten. No new environment variable, credential, scheduler provider, queue, or dependency is required.

The deployed NestJS API process starts `RecurringServiceAutoResumeRunner` after application bootstrap and then runs it every minute. The runner reconciles at most 100 PAUSED agreements whose persisted Johannesburg business-date resume date is due. Each transition is protected by a conditional database update that still requires PAUSED + due state, so multiple Railway API processes may observe a row but cannot both successfully resume it. Successful resume clears the date and recalculates `nextServiceDate` from the current Johannesburg date; an already-ended agreement moves to ENDED. Existing generated Work Orders are never generated, mutated, cancelled, or deleted by this runner.

After deployment, require `/api/v1/ready` to be healthy, pause a disposable test agreement with a near-future automatic-resume date, verify the date is persisted and shown in Admin, and verify a manual resume clears it. For a controlled database fixture whose date is due, verify exactly one ACTIVE transition and a recalculated non-backlog next date; if multiple API instances are running, confirm only one successful transition is counted. Railway restart is also a reconciliation opportunity because the runner executes on bootstrap. A failed runner pass emits only the safe event marker `recurring_auto_resume_failed` and retries on the next minute.

Application rollback should normally retain the additive nullable column/index. A prior API ignores them. If rolling back from a release while paused agreements contain future automatic-resume dates, understand that the prior application will not execute those dates; operators must either keep the corrected API running until reconciliation or manually review affected agreements. Do not drop the column as an application rollback step because that would erase persisted lifecycle intent.

## 2026-08-19 Website enquiry ingestion migration

Deploy additive migration `20260819210000_website_enquiry_ingestion` through the normal Railway `npm run deploy:api` path before the API revision that serves `POST /api/v1/integrations/website/enquiries`. It creates only the `website_enquiries` and `enquiry_daily_counters` tables, uniqueness/index boundaries, and no Customer, Property, Quote, Work Order, messaging, correspondence, Finance, or Needs Attention records. No new environment variable is introduced: the endpoint deliberately reuses the existing API-only Website integration bearer secret and must not expose that secret to Cloudflare/browser code.

After migration and API deployment, verify `/api/v1/ready`, reject missing/invalid Website authorization, accept one `website-enquiry.v1` request, confirm its returned `ENQ-YYYYMMDD-NNNN` reference is persisted, then repeat the exact immutable submission and require the same reference with replay semantics. Reusing the submission UUID with changed content must return a conflict. Do not cut the Website contact form over merely because the database migration exists; the Website consumer change is a separately coordinated Issue #73 follow-up after this OS runtime is deployed and verified. Application rollback should retain the additive enquiry tables and accepted intake history; deploy the prior API while assessing database compatibility rather than dropping authoritative references.

## 2026-08-16 atomic recurring Quote acceptance migration

Deploy `20260816180000_atomic_recurring_quote_acceptance` with `npm run db:migrate:deploy` before the API revision. No environment variables change. Verify the accepted-shape check, then smoke-check all four supported recurring frequencies, initial-visit linkage, exact add-on quantities, identical retry recovery, ADMIN authorization, and unchanged ONE_TIME acceptance. The migration creates no historical operational records; retain it during application rollback unless reviewed recovery proves otherwise.


## 2026-08-16 atomic ONE_TIME Quote acceptance migration

Deploy `20260816120000_atomic_one_time_quote_acceptance` with `npm run db:migrate:deploy` before serving the Accept endpoint. No environment variables change. Verify the migration, the `quotes_accepted_operational_shape` check, and restricted `quotes_customer_id_fkey` / `quotes_property_id_fkey`; then smoke-check ADMIN acceptance, identical retry recovery, non-ADMIN rejection, and recurring rejection. The migration does not create or convert historical records. Retain its constraints during application rollback unless a reviewed database recovery proves no accepted history depends on them.

## 2026-08-15 Quote match-resolution migration

Deploy migration `20260815220000_quote_customer_property_resolution` before the matching API revision. It additively creates `QuoteEntityResolution`, adds `MATCH_RESOLUTION_RECORDED`, and adds nullable Quote decision/revision columns with consistency checks. Run the normal `npm run db:migrate:deploy`; no environment variable changes are required.

## Internal Quote decision foundation migration

Deploy additive migration `20260815190000_quote_review_decision_foundation` through the normal Railway `npm run deploy:api` path before the API version that serves internal Quote review. It adds a nullable accepted-revision foreign key and replaces ordinary future operational-link indexes with unique restricted foreign keys. It creates no Customer, Property, Work Order, Recurring Service Agreement or accepted Quote and does not modify Website ingestion data.

After deployment, verify the migration completed and inspect the three unique indexes and foreign keys on `quotes`. At this historical foundation checkpoint the smoke check confirmed list/detail/preflight access and that no Accept route yet existed; the later 2026-08-16 ONE_TIME conversion supersedes that route limitation. A prior application can run with the additive schema; retain the constraints during application rollback unless a separately reviewed database rollback is required.

## Slice 5M-A Quote domain migration

Deploy additive migration `20260811210000_quote_domain_foundation` through the normal Railway `npm run deploy:api` / Prisma deploy path before any later Slice 5M service code that reads or writes Quotes. It creates the Quote lifecycle, revision, pricing-line, photo, activity, and daily-counter tables plus their enums and indexes. It does not backfill or mutate existing Customers, Properties, Work Orders, Recurring Service Agreements, Services, or media records.

After deployment, verify the migration completed and that the API readiness endpoint still succeeds before exercising Quote creation. Application rollback should retain the additive schema and deploy the prior application version; do not drop Quote tables as part of ordinary application rollback.

## Deployment-controller verification

The production deployment controller for `apps/web` is Cloudflare's native Git integration. GitHub Actions is validation-only and must not deploy production. The legacy Railway web service is rollback-only until separately retired.

Before calling this cutover verified, inspect Cloudflare itself and confirm that the production Worker/Pages project is still connected to `HestivaHQ/HestivaOS`, still tracks the intended production branch, and that a merged `main` commit produces a successful native Cloudflare deployment of that exact commit. Repository inspection alone is not sufficient evidence for this provider-owned control plane. Record the verified production project name, branch, and exact deployed commit in the deployment evidence without copying secrets.

A failed Cloudflare native deployment blocks release of that commit even if pull-request CI was green. Repair the native deployment or roll back through the reviewed Git path; do not silently restore GitHub Actions as a second production deployer.

## Runtime topology

Production topology:

- Web: Cloudflare native Git integration from the canonical GitHub repository.
- API: Railway persistent service.
- Database/Auth/Storage: Supabase.
- Repository CI: GitHub Actions validation only.
- Railway web service: rollback-only while retained; it is not the production deployment controller.

## GitHub Actions configuration

No repository secret is required for production web deployment. The Cloudflare production binding is provider-owned in Cloudflare.

Repository Actions may still contain validation-only configuration, but they must not become a hidden second deployer.

## Required Cloudflare Worker bindings

The production Worker requires the following bindings at runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_BASE_URL`

The repository intentionally does not commit these values. Keep `.dev.vars` for local-only use and manage production values in Cloudflare.

## Required Railway API configuration

The API requires these runtime variables:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`
- `PORT` (optional; Railway provides this automatically)
- `PRISMA_POOL_MAX` (optional; defaults to `4` and is normalized to the bounded range `1..10`)
- `HESTIVA_LAUNCH_BASELINE_RESET_ENABLED` (optional; defaults disabled; set to exact `true` only for an approved pre-launch acceptance/reset window, then remove/disable immediately)

Additional optional provider/domain configuration is documented in `ENVIRONMENT.md`.

`DATABASE_URL` should use the Supabase **transaction pooler** endpoint on port `6543` with `pgbouncer=true` for the persistent Railway API runtime. `PRISMA_POOL_MAX` is applied to Prisma's PostgreSQL connection URL as `connection_limit`; if the source URL already contains a `connection_limit` query parameter, the API overrides it with the normalized configured value. The runtime deliberately does not set `pool_timeout=0`; bounded wait/timeout behavior remains intact.

Use the direct/session connection on port `5432` only for migration/admin workflows where a session-capable connection is required.

## Railway service settings

The Railway API service should use:

- **Root directory:** repository root
- **Build command:** `npm run build:api`
- **Start command:** `npm run start:api`
- **Pre-deploy command:** `npm run deploy:api`

`npm run deploy:api` runs `prisma migrate deploy` and then starts the production API command. This is the repository's required migration-before-runtime path.

## CORS

Set `ALLOWED_ORIGINS` to the exact production web origins that may call the API, for example:

```text
https://os.example.com,https://www.os.example.com
```

Do not use wildcard production CORS. The API permits no cross-origin requests when `ALLOWED_ORIGINS` is missing or empty. Non-CORS server-to-server requests without an `Origin` header remain allowed.

## Database migrations

Production migrations must use:

```bash
npm run db:migrate:deploy
```

Do not use `prisma migrate dev` against production.

The API deployment path already runs `prisma migrate deploy` before starting the service. This ensures additive migrations land before the matching API code begins serving traffic.

## Release verification

After deployment:

1. confirm Railway migration deploy completed successfully;
2. confirm the API health endpoint is healthy;
3. confirm the API readiness endpoint reports `status: ready`;
4. confirm the web app loads from Cloudflare;
5. confirm authenticated web requests reach the Railway API;
6. confirm no secrets are present in browser-delivered configuration or logs.

## Rollback

Application rollback and database rollback are separate decisions.

For an application rollback:

1. deploy the previously known-good application version;
2. retain additive database migrations unless there is a reviewed reason not to;
3. verify the previous application remains compatible with the current schema;
4. verify health and readiness after rollback.

Do not reverse production migrations automatically as part of application rollback. Destructive schema rollback requires an explicit database recovery decision.
