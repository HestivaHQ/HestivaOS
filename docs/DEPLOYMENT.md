# Deployment

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

The migration requires every Quote to carry a database-unique `submission_key` and every QuotePhoto to carry a database-unique `transfer_key`. These are internal retry/idempotency identities, not customer-facing references. Later ingestion/photo-transfer implementations must generate or receive the key once and reuse it on every retry; they must not mint a new key merely because a transport attempt timed out. The unique indexes are the final duplicate-prevention boundary.

Before merge/deploy, require both PostgreSQL replay jobs and the normal repository verification job to pass. After deployment, verify Prisma reports the migration finished and inspect that `quotes_submission_key_key` and `quote_photos_transfer_key_key` exist. No runtime Quote endpoint exists in 5M-A, so there is no production Quote-creation smoke test until the next sub-slice. If application rollback is required, leave these additive tables in place and deploy the prior application; do not drop Quote history or retry identities as an application rollback step.

The `20260810220000_canonical_service_catalogue` migration is additive and data-aware. It preserves existing Service IDs and relationships, classifies unambiguous catalogue matches, reconciles the approved Eco alias only when safe, creates missing approved records, and leaves ambiguous or OS-only rows intact. Apply it through the existing `npm run db:migrate:deploy` release path; do not manually delete or reseed production Services.

## Frontend: Cloudflare native Git builds

Cloudflare's native Git integration connected to `HestivaHQ/HestivaOS` is the active and single deployment authority for `@hestiva/web`. A change merged to `main` triggers the configured Cloudflare build, which installs the root workspace dependencies and builds the Next.js application with OpenNext for Worker `hestivaos`.

The frontend is pinned to Next.js 16.3.0 and uses Next.js 16's default Turbopack build behavior. No `--webpack` compatibility flag is configured: the application has no custom webpack configuration, and OpenNext 1.20.2 declares a compatible Next peer range for 16.3.0. The migration did not change Worker configuration or deployment authority.

The Cloudflare production build environment must provide `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The workspace deployment command runs `validate:cloudflare-env` before OpenNext starts and fails with missing variable names only. It never prints values. Optional public Storage bucket names are also build-time configuration when production does not use the application defaults.

`apps/web/wrangler.jsonc` owns repository-declared Worker runtime configuration, including `API_URL`. Its `keep_vars: true` policy preserves deliberately platform-managed runtime variables rather than deleting them during a later Wrangler deployment. This preservation policy does not turn Worker runtime variables into build variables: all `NEXT_PUBLIC_*` values needed by browser code must still exist in the Cloudflare production build environment before deployment.

For local verification, from the repository root:

```bash
npm install
npm run typecheck --workspace @hestiva/web
npm run build --workspace @hestiva/web
```

The workspace's verified manual OpenNext deployment command is:

```bash
npm run deploy --workspace @hestiva/web
```

Use it only for an explicitly authorized recovery; routine releases belong to native Git builds. The former GitHub Actions Cloudflare deployment workflow has been removed, so pull-request automation cannot become a competing frontend deployer. Railway web automatic deployment is disabled. Its web service is temporarily retained only as a rollback option.

### Verify and roll back the frontend

1. Confirm the native build used the intended `main` commit, passed required-variable validation, and completed successfully.
2. Open the production web entry point, exercise authentication, and verify a server-rendered and a browser API request.
3. Check Worker logs for HTTP 500 errors and confirm the API health endpoint separately.
4. To roll back, redeploy a previously known-good Cloudflare deployment using Cloudflare's deployment controls. Do not reactivate a second controller. Use the Railway web backup only as an explicitly approved last resort, then restore Cloudflare authority.

## API: Railway

The Railway `CORS_ALLOWED_ORIGINS` value is a comma-separated allowlist of approved frontend origins. Entries may contain separator whitespace or a trailing slash because API startup normalizes both; responses still match only an approved origin and retain credentialed-request support. After changing the value, restart the API and verify an authenticated OPTIONS request is followed by its GET/POST/PATCH request.

The Railway API service uses the repository root as **Root Directory**. Its checked-in configuration is:

```text
Build command: npm run build --workspace @hestiva/api
Start command: npm run deploy:api
Health path: /api/v1/health
```

The root `deploy:api` command runs `db:migrate:deploy` once and starts `@hestiva/api` only after the migration succeeds. The API workspace `start` script is a pure process start that runs `node dist/main.js`; it does not run migrations itself.

Root `npm install` and `npm ci` run `npm run db:generate` through the root `postinstall` lifecycle. This repository bootstrap generates Prisma Client from the checked-in API schema before any workspace typecheck, build, or test consumes its types. The API workspace build now runs only `nest build`, avoiding a second generation during the same installed dependency lifecycle. A clean Railway or CI install must show successful Prisma Client generation before compilation begins.

### API monitoring endpoints and logs

Railway's health path remains the lightweight `GET /api/v1/health` liveness check. A successful request returns HTTP 200 with this shape (values are illustrative):

```json
{
  "status": "healthy",
  "uptime": 123.45,
  "version": "0.1.0",
  "timestamp": "2026-08-07T00:00:00.000Z"
}
```

Use `GET /api/v1/ready` when an operational check must include dependencies. It verifies the running process and database, and checks the Supabase Auth health endpoint when both a supported Supabase URL and anonymous-key variable are configured. It returns HTTP 200 with `status: "ready"` when required checks pass, or HTTP 503 with `status: "not_ready"` when the database, configured Supabase connection, or partial Supabase configuration is unavailable. An intentionally absent Supabase configuration is reported as `not_configured` and does not by itself make the API unready.

```json
{
  "status": "ready",
  "checks": {
    "process": "healthy",
    "database": "connected",
    "supabase": "connected"
  },
  "timestamp": "2026-08-07T00:00:00.000Z"
}
```

API logs are one JSON object per line. Completed-request records contain timestamp, request ID, HTTP method, path without its query string, response status, and duration in milliseconds. The API accepts a syntactically safe `X-Request-ID` or generates a UUID, echoes it in the response header, and uses it in request and error records. Error records also contain endpoint, stack trace, HTTP status, and environment. Startup success records contain application version, environment, startup duration, listening port, and confirmation status. These records intentionally omit request headers, request/response bodies, query strings, credentials, and environment-variable values.

### Business Profile migration

Migration `20260809120000_add_business_profile` creates one additive `business_profiles` table with nullable information fields, persisted share defaults, and a singleton-key check. It seeds no company information and changes no existing table. The normal Railway `db:migrate:deploy` step applies it before API startup. Application rollback does not remove the table; preserve the row and deploy a compatible application or perform a separately reviewed database rollback.

### Verify and roll back the API

1. Confirm Railway resolved the root `package.json` and installed workspaces.
2. Confirm build and migration logs finish without errors and the process remains running.
3. Request `/api/v1/health` on the configured Railway API hostname and require HTTP 200, then request `/api/v1/ready` and require HTTP 200 with connected dependency checks.
4. Exercise a harmless authenticated API read from the frontend. Confirm its `X-Request-ID` response header matches the structured completion record in Railway logs.
5. If necessary, use Railway to redeploy the last known-good API commit. Database migrations require separate compatibility assessment; never assume an application rollback reverses schema changes.

See the [recovery guide](RECOVERY_GUIDE.md) for symptom-specific procedures and [environment guide](ENVIRONMENT.md) before changing configuration.

## Pull-request verification (non-deploying)

Pull requests targeting `main` run `.github/workflows/pr-quality-gates.yml` with Node.js 24. An isolated PostgreSQL 17 service replays all migrations from zero and from the pre-5K state before asserting enum, catalogue, Property-column, and migration-history outcomes. The workflow uses `npm ci` at the repository root; its root `postinstall` generates Prisma Client before later commands. It then validates the documentation policy against the pull request base and head, scans tracked files for high-confidence secret formats, runs the root typecheck, root build, and root test commands, builds the API and web workspaces independently, and runs `git diff --check`. The repository currently has no lint script, so this workflow does not invent or run a lint configuration.

`npm test` runs the API Jest suite followed by the web workspace's explicit no-tests command. The API suite covers liveness metadata, successful and failed dependency readiness including optional Supabase states, request-ID propagation and generation, response correlation headers, and safe structured request fields. It mocks database and Supabase access and does not call production services. Run the same checks locally from the repository root:

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run build --workspace @hestiva/api
npm run build --workspace @hestiva/web
npm run secrets:scan
python3 scripts/validate_documentation.py <base-revision> <head-revision>
git diff --check <base-revision>...<head-revision>
```

This GitHub Actions workflow verifies only. It does not deploy or replace either deployment authority: Cloudflare native Git builds remain responsible for the frontend, and Railway remains responsible for the API.

## Manual dependency security diagnostic (non-deploying)

Maintainers can manually dispatch `.github/workflows/dependency-security-audit.yml` when registry-backed dependency findings are required. On Node.js 24 it runs the root `npm ci` bootstrap, verifies the generated Prisma Client export, then records full, production-only, and JSON npm audits plus `npm outdated --all`. Expected non-zero diagnostic statuses are reported without preventing later collection, and the JSON output is retained as a downloadable artifact for 14 days when produced. The workflow never changes dependencies or deploys, has read-only repository permission, and uses no Railway, Cloudflare, Supabase, or other production credentials. Its results require maintainer assessment before any remediation change.

## Employee Records migration

Slice 5 adds the additive `20260810120000_add_employee_records` migration. The normal Railway `npm run deploy:api` path applies it before API startup. It creates only the `EmployeeStatus` enum and `employee_records` table, indexes, and nullable `ON DELETE SET NULL` links; it does not update or delete existing Users, Technicians, crews, shifts, or work orders and performs no identity backfill. After deployment, verify Prisma migration completion, an ADMIN list request, and non-ADMIN rejection. Do not infer legacy links by matching names, phone numbers, or email addresses.

## Slice 5B controlled-list migration

Deploy migration `20260810160000_add_controlled_business_lists` before serving the Slice 5B API. It additively creates the typed business-list table and nullable Employee foreign keys; it does not seed, rewrite, or remove existing Employee job-title or department text. Run the normal Prisma deploy and post-deploy Employee/Business Lists smoke checks. Roll back application code before database objects if necessary; retaining the additive table and nullable columns is safe for the prior application.

## Slice 5C property-type migration

Deploy `20260810190000_add_property_type_controlled_input` through the normal Prisma deployment before the Slice 5C API. It additively extends the existing enum, adds a nullable Property lookup column, index, and restricted foreign key, and performs no seed, backfill, update, or delete. Verify active Property Types can be assigned, wrong/inactive option types are rejected, and existing Properties remain readable.

### Website Property Type bootstrap

Migration `20260810230000_bootstrap_website_property_types` runs through the existing Railway `db:migrate:deploy` boundary. It inserts only missing case/whitespace-normalized approved `PROPERTY_TYPE` options: Apartment, Townhouse, House, Duplex, and Other. Existing custom and inactive records and Property relationships are preserved. An inactive approved label produces a migration notice and is not reactivated. Verify migration output, then confirm active options through the authenticated Business Lists API and Property form; never manually delete historical options or seed “Not classified”.

## Slice 5H Work Order reference migration

Apply additive migration `20260811010000_add_work_order_references` before the updated API. It adds nullable `reference` and `service_id`, database uniqueness and relationship indexes, and the daily counter table; it neither backfills nor removes historical titles. After deployment, create two authorized Work Orders with an active Service and verify distinct same-day references, reference search, legacy-row readability, and inactive-Service rejection.

## Slice 5I accepted-quote Work Order migration

Deploy additive migration `20260811150000_accepted_quote_work_order_structure` before the updated API. It adds nullable frequency, custom-frequency-note, and home-condition columns plus the `work_order_add_ons` relationship table. It does not backfill historical rows or rename/remove `service_id`. After deployment, verify an authorized create with one active PRIMARY, zero and multiple active ADD_ON Services, each controlled frequency/condition, and then confirm existing inactive/null service relationships remain readable. Roll back application code before considering database rollback; retain the additive columns/table while investigating to avoid discarding accepted-quote relationships.

## Slice 5J Property operational profile migration

Deploy additive migration `20260812120000_property_operational_profile` before the updated API. It creates four controlled count enums and nullable Property columns for the operational profile. It performs no backfill: null means unknown for historical records, and Province is retained. After deployment, validate Prisma, create an unprofiled Property, create/update a profiled Property with each controlled count, and confirm the Work Order response reads the current related Property. Roll back application code first if needed; retaining nullable columns avoids information loss.

## Slice 5K service availability rollout

Migration `20260810233000_service_availability_and_addon_reconciliation` now only adds `ServiceType.BOTH`; consecutive migration `20260810233100_service_availability_and_addon_data` uses the committed value, updates Interior Window Cleaning and Laundry Folding by normalized name, and inserts six fixed-ID add-on records with `ON CONFLICT DO NOTHING`. It creates no scope structures or Work Order rows. Production has a failed record for the first name from PR #69, so do not run a routine Railway redeploy until the read-only checks and controlled `migrate resolve` procedure in the recovery guide are complete.

## 2026-08-10 Property vocabulary migration

Apply `20260810180000_property_quote_vocabulary` before deploying this release, then run `npm run db:generate`. The migration is additive: it adds four nullable columns and enum values and deliberately retains `is_estate_or_complex` and `THREE_PLUS`. It performs no data backfill; legacy `true` classifications and `THREE_PLUS` storeys require later manual enrichment when authoritative facts are available.

The timestamp places this migration before `20260812120000_property_operational_profile`, which originally introduced the base bedroom/storey types and columns. Both historical files contain deterministic existence checks so clean lexical replay and an existing database where the profile migration already ran converge without rewriting values. Pull-request PostgreSQL replay must pass both clean and staged modes before deployment.

## Recurring service migration (2026-08-11)

Migration `20260811190000_recurring_service_agreements` is additive: it creates three new enums, two tables, nullable Work Order link/date columns, indexes, foreign keys, and occurrence uniqueness. It does not rewrite existing Work Orders or Services. Deploy through the existing `prisma migrate deploy` path and retain both clean and staged PostgreSQL replay gates. After deploy, verify the migration is finished and the unique index `work_orders_recurring_agreement_id_recurrence_date_key` exists before invoking generation.

### 2026-08-16 non-lossy Quote handoff migration

Migration `20260816170000_non_lossy_quote_handoff` additively creates typed Work Order context columns, the recurring eco-product preference, accepted-Quote evidence links, and visit-scoped temporary-access credentials. Deploy with the normal Prisma migration-before-start sequence. No environment variable changes are required.

## 2026-08-17 Work Order Technician assignment migration

Run the normal `npm run db:migrate:deploy` path for `20260817120000_work_order_technician_assignments` before deploying assignment-aware API/web code. The additive migration creates `work_order_technicians`, its composite uniqueness and Technician lookup index, then copies existing non-null legacy `technician_id` values. It does not alter Crew membership or Quote, recurrence, Customer, or Property data. After deploy, verify the legacy/backfill count, ADMIN assignment mutation, duplicate prevention, inactive eligibility rejection, and stable saved assignments after a Crew membership edit.

## 2026-08-17 Crew and Job Leader rollout

Apply `20260817160000_crew_and_job_leaders` after the normalized Work Order Technician assignment migration, then regenerate Prisma Client. The additive migration adds the Job Leader foreign key/index and activity enum value. It backfills only Work Orders with exactly one normalized Technician assignment; review and explicitly resolve any staffed multi-Technician row with a null Job Leader through ADMIN tooling after deployment.

## Homent Technician B1 deployment

The existing web deployment serves `/technician`, `/technician/manifest.webmanifest`, `/technician-sw.js`, and `/technician-icon.svg`; no second service or environment variables are introduced. Deploy the API migration before exposing Start Job, then verify the manifest, service-worker scope, authenticated assignment feed, and one online Start Job in the target environment.

## 2026-08-17 Execution Scope migration

Deploy migration `20260817193000_homent_execution_scope` before the matching API. It adds only nullable Work Order binding and new normalized tables/enums; it does not fabricate scope for existing rows. After deployment, generate Prisma Client, validate the schema, and verify an old Work Order remains readable with no Execution Scope while a new Published-template revision can be created and bound at Start Job.

## Homent Technician D deployment

Deploy additive migration `20260817220000_offline_execution_evidence` before the matching API/web release. It extends the B2/C evidence table with UUID identity typing, Work Order/scope/Technician bindings, purpose, and storage path; existing B2/C placeholder rows derive these values from their section/outcome relationships. No new environment variable or storage provider is introduced: uploads reuse `NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET`. Verify the bucket's existing authenticated upload policy accepts deterministic nested paths. This slice does not change legacy bucket privacy; do not expose a service-role key to the web application.

## 2026-08-18 Homent Technician completion migration

Deploy additive migration `20260818120000_homent_technician_completion` before the matching API and web release. It adds completion/audit/acknowledgement columns, two activity values, indexes and foreign keys; it neither changes existing Work Order statuses nor sends correspondence. Generate Prisma Client and verify one ready `ON_SITE` scoped job can reconcile to `COMPLETED`, remains awaiting acknowledgement, and becomes correspondence-eligible only after an ADMIN or SUPERVISOR acknowledgement. IndexedDB upgrades from v3 to v4 without deleting the existing jobs, operations or evidence stores.

## Phase 3A access-readiness deployment

Apply `20260818230000_work_order_access_readiness` through the standard Prisma deploy step before serving the corresponding API. It additively creates the readiness enum/current-state column, attention/activity enum members, and append-only readiness-event table. Existing Work Orders default to `NOT_REQUIRED`; no environment variable or credential-store configuration changes. Verify Prisma migration state, an authorized ADMIN/SUPERVISOR state change and history read, and Needs Attention open/self-resolution without inspecting or logging credential data.

## Phase 3B protected credential deployment (2026-08-18)

Deploy migration `20260819000000_protected_temporary_access_credentials` before the Phase 3B API. Configure API-only `TEMPORARY_ACCESS_CREDENTIAL_ENCRYPTION_KEY` as a base64-encoded 32-byte value through the deployment secret manager; never expose it to Next.js or commit it. Confirm the temporary-access attachment prefix remains private. Validate ADMIN metadata/create/review/reveal/revoke requests and verify broad Work Order, Dashboard, Needs Attention, and Technician responses contain no protected values. Phase 3C and Phase 3D have no deployment changes here.

## Phase 3C access appointment escalation (2026-08-19)

Deploy additive migration `20260819120000_access_appointment_escalation` before the API. It adds `PRIORITY_CHANGED` to `AttentionActivityType`; there are no new tables, environment variables, storage objects, background workers, timers, provider integrations, or Finance configuration. After deployment, an authorized Needs Attention read deterministically reconciles current priorities from persisted Work Order schedules and safe access usability metadata.

## Phase 3D access recovery deployment (2026-08-19)

Deploy additive migration `20260819160000_work_order_access_recovery` before the matching API/web release. It creates provider-neutral conversation/message and visit-recovery correlation tables and adds optional source-message provenance to protected credentials. There are no new environment variables, provider secrets, workers, schedules, storage buckets, or Finance configuration. Existing provider integrations must register their adapter in the canonical registry and deliberately link a conversation to a Customer before recovery becomes available. Verify ADMIN-only summary/send/candidate routes, same-key delivery retry, webhook replay preservation, private attachment policy, and non-exposure in broad Work Order/Needs Attention/Technician responses.

## Phase 4A Work Order incidents deployment (2026-08-19)

Deploy migration `20260819120000_work_order_incidents` before the matching API/web release, then regenerate Prisma Client. The migration is additive: controlled enums, incident/review tables, an incident evidence link, and a Needs Attention type. Verify assigned Technician idempotent reporting, incident evidence acknowledgement, ADMIN/SUPERVISOR review, and attention reconciliation. No environment variable, Storage bucket policy, correspondence provider, or Finance configuration changes.

## Private Execution Evidence read deployment (2026-08-19)

No migration or new bucket is introduced. Keep the existing Work Order photo bucket private, configure API-only `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_WORK_ORDER_PHOTOS_BUCKET` in Railway, and deploy the API before relying on private evidence links. Verify an ADMIN/SUPERVISOR and an assigned Technician can obtain a 60-second URL for acknowledged evidence; verify an unassigned Technician, unrelated role, wrong Work Order and pending evidence are denied; inspect broad API responses for absence of `storagePath`. Never place the service-role key in Cloudflare or browser variables.

## Technician completion correction migration (2026-08-19)

Deploy migration `20260819190000_technician_completion_corrections` before the API/web release. It adds the append-only correction aggregate, corrected-outcome linkage, idempotency uniqueness, and a partial unique index allowing one active correction per Work Order. No environment variable, storage, Finance, correspondence, or provider configuration changes.
