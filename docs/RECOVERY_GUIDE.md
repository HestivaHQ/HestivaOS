# Recovery guide

## Three-stage PR validation recovery (2026-08-19)

Treat each final PR job as an independent diagnostic boundary. **Validate policy, secrets and diff** failures are repository/documentation/security/whitespace problems and do not justify rerunning application builds locally. **Validate API** failures should be reproduced with the smallest relevant API test/typecheck/build command. **Validate web and Cloudflare bundle** failures should be isolated to web tests/typecheck, Cloudflare type generation, OpenNext, or Wrangler as indicated by the failing step. **Replay PostgreSQL migrations** remains the database-history authority: never bypass a clean/staged replay failure, edit another lane's migration, mark an unverified migration applied, or weaken the replay harness merely to make CI green.

During Stage 1, use proportional checks while the branch is fluid. Once Stage 2 begins, finish all documentation/coordination and full-diff reconciliation before freezing the exact head. If a required final job fails because of a real code/configuration/documentation defect, inspect that exact job/step, fix only the evidenced cause on the same branch, run proportional affected-area checks, re-audit the affected area plus complete-diff integrity, freeze the new head and let the complete required PR workflow run again. Do not rerun or merge a stale prior green result after the head changes.

If a job appears to have failed only because of transient GitHub runner/service infrastructure and the PR head/base are unchanged, an authorized operator may rerun the failed job rather than changing repository content. Do not use a rerun to hide deterministic failures. If the workflow YAML/topology itself is broken, repair or revert the workflow files on the same reviewed branch; this validation architecture is non-deploying and requires no Cloudflare, Railway, Supabase, credential, schema or production-data recovery action.

Immediately before merge, verify all four required jobs are green for the exact reviewed head, the integration base is still acceptable, and the parallel-PR/canonical-documentation/append-only-history checks remain clean. A cancelled, running, superseded, stale or red job is not merge evidence. This section supersedes the older single-job `PR quality gates / Verify repository` recovery wording later in this guide where it describes the pre-ADR-0067 CI topology.

## Recurring automatic resume recovery (2026-08-19)

Treat `auto_resume_date` as durable recurring-agreement lifecycle intent. If a paused agreement passes its automatic-resume date while Railway or the API is unavailable, restoring or restarting the corrected API is sufficient for normal recovery: the runner reconciles once during application bootstrap and then every minute, and any persisted date on or before the current Africa/Johannesburg business date is due. Do not cause lifecycle mutation through a GET/read path, create a replacement Work Order, or rewrite recurrence history to compensate for downtime.

If an agreement remains `PAUSED` after its automatic-resume date, first verify migration `20260819223000_recurring_auto_resume` is finished and that `auto_resume_date` plus the `(status, auto_resume_date)` index exist. Verify Railway liveness/readiness, then inspect the affected agreement read-only: status, automatic-resume date, end date, frequency, effective date, weekday/day-of-month, and next service date. Review safe `recurring_auto_resume_failed` event markers without adding Customer, Property, credential, or raw database-error content to incident records. Restart or redeploy the corrected API when necessary; bootstrap reconciliation provides an immediate retry opportunity.

If multiple Railway API instances are running, do not manually deduplicate or edit the same agreement. Each runner may observe a due row, but the database-conditional `PAUSED` + due update is the concurrency authority and only one transition may succeed. An agreement whose end date has already passed must reconcile to `ENDED`, not `ACTIVE`.

If application rollback occurs after automatic-resume dates have been scheduled, retain the additive nullable column and index and identify PAUSED agreements with non-null `auto_resume_date`. A prior application revision will not execute those dates. Prefer fixing forward or redeploying the corrected runner; otherwise explicitly review the affected agreements operationally. Never drop or null the column wholesale merely to remove the symptom, because that destroys persisted lifecycle intent. Existing generated Work Orders remain independent records and must not be mutated, cancelled, regenerated, or deleted as part of automatic-resume recovery.

## Website enquiry ingestion recovery (2026-08-19)

Treat `submissionId` and the returned `ENQ-...` reference as durable recovery identities. If the Website receives a timeout or uncertain response after submitting an enquiry, retry the exact immutable payload with the same submission UUID; HestivaOS will return the existing authoritative reference if the first transaction committed. Never mint a new submission UUID merely to bypass uncertainty or a uniqueness conflict. A conflict for the same UUID with different content is intentional fail-closed behavior and requires investigation rather than overwrite.

If deployment fails after migration `20260819210000_website_enquiry_ingestion`, verify Prisma migration state and inspect `website_enquiries` / `enquiry_daily_counters` read-only. Do not reset a daily counter, delete an accepted enquiry, regenerate a human reference, or edit `_prisma_migrations` directly. Application rollback may retain the additive tables and accepted intake history. If the daily sequence reaches 9,999, intake intentionally fails; investigate volume rather than reusing or resetting references. If authentication fails, verify only that the existing server-side Website integration secret is correctly configured in Railway and the Website server; never expose or copy its value into logs/browser code.

Do not repair a Website email/reference mismatch by editing HestivaOS enquiry history. Before Website cutover, email delivery remains the existing Website behavior. After coordinated cutover, customer/Admin success correspondence must use only the `enquiryReference` acknowledged by HestivaOS; an OS ingestion failure must remain a failed public intake rather than falling back to a locally invented reference.

## Atomic recurring Quote acceptance recovery

Deploy `20260816180000_atomic_recurring_quote_acceptance` before the recurring Accept revision. It strengthens accepted shape so every accepted Quote has an initial Work Order; a recurring accepted result must additionally have an agreement and a Work Order linked to that same agreement. After a timeout or serialization conflict, reload and retry with the same revision. A complete matching result is returned without duplicate writes; incompatible linkage fails closed. Never create a replacement agreement/visit or manually mark the Quote accepted. Any reported partial Customer, Property, agreement, visit, or activity indicates abnormal transaction/database behavior and requires investigation.


## Atomic ONE_TIME Quote acceptance recovery

Migration `20260816120000_atomic_one_time_quote_acceptance` replaces the pre-acceptance resolution checks, adds restricted Quote Customer/Property foreign keys, and requires complete accepted operational shape. Deploy it before the Accept API revision. If acceptance times out or returns a serialization conflict, reload Quote detail using the same expected revision before retrying. A complete accepted ONE_TIME result can be recovered by an identical retry; do not create a direct replacement Work Order or manually relink IDs.

If any Customer, Property, Work Order, or acceptance activity exists without the complete accepted Quote after a reported failed transaction, stop and investigate database/transaction health: normal failure rolls back every record. Never mark a Quote `ACCEPTED` manually. For incompatible accepted state, preserve all rows and obtain a reviewed reconciliation plan. Application rollback may retain the additive foreign keys/check; database rollback must not remove accepted history.

## Quote match-resolution recovery

If a resolution request returns conflict, reload Quote detail/preflight and compare `currentRevisionNumber`, stored decisions, and selected IDs. Identical retries are safe; a differing stored decision is intentionally not overwritten. Correcting a deliberate decision currently requires a separately reviewed replacement mechanism or database recovery—do not clear fields ad hoc. No Customer, Property, Work Order, or recurring agreement needs rollback because review does not create them.

## Internal Quote decision foundation recovery

Migration `20260815190000_quote_review_decision_foundation` adds the nullable accepted-revision link and unique restricted foreign keys for future Work Order and Recurring Service Agreement linkage. Deploy it through the normal Prisma migration path before serving the internal Quote review API. Verify `quotes_accepted_revision_id_key`, `quotes_work_order_id_key`, and `quotes_recurring_agreement_id_key` plus their foreign keys. Do not remove accepted revisions or operational records to bypass a restriction.

If Decline returns a conflict after a timeout, read the Quote detail and activities before retrying. An identical retry with the same Admin, expected revision and normalized reason returns the existing declined decision. A different actor/reason/revision is intentionally a conflict and must be reviewed rather than overwritten. At that historical foundation checkpoint no Accept endpoint existed; use only the later atomic ONE_TIME endpoint described above and never manually set `ACCEPTED`.

Application rollback may leave the additive column, indexes and foreign keys in place. Before rolling back the database, inspect for populated linkage values and accepted-revision references; never drop accepted history as an application-recovery shortcut.

## Slice 5M-A Quote-domain recovery

Migration `20260811210000_quote_domain_foundation` is additive. If rollout fails, first determine whether the failure is application code, Prisma migration state, or database reachability. Do not drop Quote tables, delete `_prisma_migrations` rows, or regenerate customer-facing references as a recovery shortcut.

For migration verification, use `prisma migrate status` and read-only inspection. A healthy database contains `quotes`, `quote_revisions`, `quote_line_items`, `quote_photos`, `quote_activities`, and `quote_daily_counters`, together with unique indexes `quotes_reference_key`, `quotes_submission_key_key`, `quote_revisions_quote_id_revision_number_key`, and `quote_photos_transfer_key_key`. The migration creates no historical Quote rows and does not alter existing Customer, Property, Work Order, Recurring Service Agreement, or Service records.

The `submission_key` and `transfer_key` columns are operational recovery identities. If a website/ingestion request times out after the server may have committed, retry with the **same submission key** and resolve the existing Quote rather than generating another key/reference. If a photo transfer fails or its result is uncertain, retry with the **same transfer key** and reconcile the existing `QuotePhoto` state rather than creating another photo row. Never use a new idempotency key merely to bypass a uniqueness conflict; first investigate whether the prior operation already succeeded.

If a Quote is `NEEDS_ATTENTION` or a photo is `FAILED`, preserve the Quote, its revision, successful photos, failure metadata, and activity history. Resolve the failed transfer and clear the attention state only through the later approved service-layer workflow; do not delete/recreate the Quote to obtain a clean status. If application rollback is needed before those services exist, redeploy the previous application and leave the additive Quote schema in place.

## 2026-08-10 PR #69 / PR #70 migration recovery

PR #69 failed at `20260810233000_service_availability_and_addon_reconciliation` with Prisma P3018/PostgreSQL 55P04 because one migration batch both added and used `ServiceType.BOTH`. PostgreSQL does not permit use of a newly added enum value until the transaction that adds it commits. Prisma subsequently reports P3009 and blocks later migrations.

PR #71's first clean PostgreSQL replay then proved that PR #70 also had an independent migration-history defect: `20260810180000_property_quote_vocabulary` sorts before `20260812120000_property_operational_profile`, although the latter was the migration that originally created `BedroomCount`, `StoreyCount`, and their Property columns. Existing environments where the profile migration had already run concealed the gap; an empty database reached 5J-A first and failed with PostgreSQL 42704/Prisma P3018. The repaired 5J-A migration creates the two expanded enums when absent or only appends compatibility values when they already exist. The later profile migration conditionally creates all four base profile enums and adds its nullable columns only when absent. No values are backfilled or rewritten.

The subsequent clean replay passed. The first staged replay failed before contacting PostgreSQL because the test harness tried to copy `apps/api/prisma/migrations/migration_lock.toml`, but no such file exists anywhere in the repository. Staged mode now copies only `schema.prisma` plus actual migration directories that sort before the 5K boundary, verifies the expected number and names finished, and then deploys and verifies the complete real chain. This was a CI workspace-construction defect, not another database migration failure.

The failed SQL batch is expected to have rolled back as one PostgreSQL transaction, but production is not reachable from repository validation. An authorized operator must first run these read-only queries; do not infer production state from the repository:

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, logs
FROM "_prisma_migrations"
WHERE migration_name IN ('20260810180000_property_quote_vocabulary', '20260810233000_service_availability_and_addon_reconciliation', '20260810233100_service_availability_and_addon_data')
ORDER BY started_at;

SELECT e.enumsortorder, e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'ServiceType' ORDER BY e.enumsortorder;

SELECT id, name, normalized_name, type, status FROM services
WHERE normalized_name IN ('interior window cleaning', 'laundry folding', 'ironing', 'bed making', 'linen change', 'garage sweeping', 'extra bathroom cleaning', 'pet-hair treatment')
ORDER BY normalized_name, id;

SELECT column_name, udt_name, is_nullable FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'properties'
  AND column_name IN ('bedrooms', 'bathrooms', 'living_areas', 'storeys', 'floor_size', 'outdoor_area', 'estate_classification', 'unit_floor')
ORDER BY column_name;
```

After deploying the repaired migration files but before restarting the API, the authorized operator must follow this decision:

1. If the failed row is unresolved and any intended 5K effect is absent (the expected transaction-rollback state), manually run `DATABASE_URL="$PRODUCTION_DATABASE_URL" npx prisma migrate resolve --rolled-back 20260810233000_service_availability_and_addon_reconciliation --schema apps/api/prisma/schema.prisma`.
2. If every intended effect is present, stop and obtain a reviewed incident-specific plan before considering `--applied`; this guide deliberately does not advise marking an unverified migration applied.
3. If state is mixed, stop. Preserve the database and migration history and obtain a reviewed reconciliation plan; do not reset, drop schemas, delete history, or guess.
4. For the verified rolled-back case, manually run `DATABASE_URL="$PRODUCTION_DATABASE_URL" npm run db:migrate:deploy`. This reapplies the same migration name as enum-addition-only, commits it, then runs the new data migration and all later pending migrations.
5. Rerun all four read-only queries. Require `BOTH`, exactly the two intended dual-context rows, all six canonical IDs/names, all eight profile/vocabulary Property columns, and finished migration rows with no unresolved failure. Then restart/redeploy the Railway API and verify `/api/v1/health`, `/api/v1/ready`, and a harmless authenticated catalogue/Property read.

Do not run `prisma migrate reset`, modify `_prisma_migrations` directly, or mutate production during verification. Cloudflare has no migration or configuration change in this recovery.

## Slice 5E operational-flow recovery

If Customer deletion is unexpectedly refused, inspect its Property and Work Order counts through authorized application/database tooling. HTTP 409 with a safe linked-record reason is expected and must not be bypassed with direct SQL, cascade deletion, or removal of history. Only a Customer with neither relationship is permanently deletable. Restore an accidentally deleted Customer or linked records together from an authorized consistent backup.

If the shell displays the wrong role, verify the Supabase identity, then the application User resolved by `/users/sync`; do not repair presentation through Supabase metadata, Technician records, email-based role inference, or a Profile visit. The shared shell and both responsive account views must receive the same authoritative application User. Existing verified-email reconciliation and disabled-access behavior remain the approved recovery path.

For a broken continuation URL, confirm the create response contains a persisted Customer UUID; the client deliberately refuses to build a URL from a missing or invalid ID. Remove invalid query parameters and select existing records in the form. Customer edits must not enter continuation. Do not rewrite legacy `Customer.name`: labels prefer Contact name and retain Name as the historical fallback. Never create against an unknown Customer or mismatched Property. Property Type options recover with the existing Business List procedure below. Province is intentionally absent from ordinary forms: recover or inspect an existing value through authorized data/API processes without adding fabricated defaults or dropping the retained column.

## Service catalogue recovery

Restore the database and migration history together. Reapply migrations through `npm run db:migrate:deploy`; the canonical catalogue migration must not be replaced by a destructive seed. After recovery, verify existing Service IDs and Cleaning Job Template join rows, confirm missing canonical entries were created once, confirm ambiguous/legacy rows were preserved, and confirm inactive Services remain visible on historical templates but unavailable for new selection. Resolve any ambiguous case/whitespace duplicates manually with operational owners before assigning a normalized key.

## User access incident recovery

An `INACTIVE` application `User` is denied by the API even if Supabase still holds a valid provider session. Confirm access state through Admin Settings → User Access with a different active ADMIN. Re-enable OS access there; do not edit Supabase claims, recreate an Auth identity, or change `auth_user_id` manually. The provider session is not globally revoked by this implementation, but it cannot pass the Hestiva API access check.

The API prevents demotion or disablement of the last active ADMIN inside the serialized database mutation. It also rejects self-demotion and self-disable. If application data was changed outside this authoritative path and no active ADMIN remains, use the controlled database recovery procedure with authorized platform operators, restore exactly one intended application User to role `ADMIN` and status `ACTIVE`, record the incident, then verify `/users/sync` and the User Access route. Preserve verified-email stale-identity reconciliation and never resolve access incidents by deleting operational history.

## Business Profile recovery

The canonical row is `business_profiles.id = 'hestiva'`. If the page is unexpectedly blank, first verify an active ADMIN session and API connectivity; a valid empty profile is represented by nullable fields and is created safely on first ADMIN read. Restore accidental data loss from an authorized database backup rather than inventing company details. Verify restored share booleans carefully—especially banking and compliance selections—before sharing. Do not place credentials or secrets in any field. Application logs can identify the actor and field names involved but intentionally cannot reconstruct sensitive old/new values; persistent profile audit history is deferred.

## Recovery order

1. Stop overlapping deployment actions and identify the failing commit/deployment.
2. Check Supabase project availability, then Railway API health, then Cloudflare build/deployment and Worker logs.
3. Validate configuration names and platform scopes without copying values into logs.
4. Repair the lowest failing dependency first: Supabase, API, then frontend.
5. Redeploy through the single authority and complete the verification checklist.

## Symptom procedures

### Pull-request quality gate fails

Open the failed `PR quality gates / Verify repository` job and start with its earliest failing step. Reproduce that step from the repository root after `npm ci`; do not bypass a genuine type, build, test, documentation, secret-scan, or whitespace failure. Documentation-policy failures identify an implementation change with no synchronized `docs/` change. Secret-scan findings report only file and line locations and must be resolved without printing or committing the suspected value. For a build or test failure, use the independently named workspace build steps and Jest output to locate the affected workspace. Push a corrective commit and let the pull-request workflow rerun. The quality gate never deploys, so deployment rollback or activation of the disabled frontend workflow is not a CI-recovery action.

If typecheck reports missing exports such as `PrismaClient`, inspect the preceding `npm ci` output for the root `postinstall` and successful `prisma generate --schema apps/api/prisma/schema.prisma`. On a clean checkout, rerun `npm ci`; do not work around the bootstrap by adding generation to every consuming command. If generation itself fails, diagnose the install or checked-in schema/tooling error before rerunning typecheck. This procedure does not require a database connection and must not change the schema or migrations.

### Dependency security diagnostic is incomplete

Manually rerun the `Dependency security audit diagnostic` workflow and inspect each command's recorded exit status; a non-zero npm audit status normally indicates findings and does not stop later diagnostics. If `npm ci` or Prisma Client verification fails, diagnose the locked install or existing root bootstrap before interpreting audit output. If registry access fails, retain the logs and rerun later rather than changing dependencies without advisory data. Download the `npm-audit-json` artifact when present and assess it without adding fixes, overrides, deployment steps, production credentials, or automatic triggers to this temporary workflow.

### Worker returns HTTP 500

Inspect Cloudflare Worker logs and correlate the request with the deployed commit. Check that `API_URL` exists at runtime and that build-time Supabase variables existed in the deployed build. Test Railway `/api/v1/health`. If the API is healthy, reproduce with a known route and roll back the Worker to a known-good deployment if the current code/config build is faulty.

### Cloudflare native build fails

Read the earliest build error. If `validate:cloudflare-env` reports missing names, configure those names in the Cloudflare **production build environment** without copying values into logs. Confirm the build checked out the expected `main` commit, installed from the repository root so workspaces resolve, uses the supported Node/npm versions, and has all [Cloudflare build variables](ENVIRONMENT.md#cloudflare-native-build). Reproduce with `npm install`, web typecheck, and web build locally. Fix forward or retry a transient build; GitHub Actions has no frontend deployment capability and must not be made a second authority.

### Wrangler deployment fails

Wrangler is a manual recovery path, not routine authority. Confirm the operator is authenticated to the correct Cloudflare account, the OpenNext build completed, and Worker name is `hestivaos`. Run `npm run deploy --workspace @hestiva/web` only after authorization. If credentials or account selection are wrong, correct them in protected operator/platform configuration—not in Git.

### Railway workspace resolution failure

Set Railway API Root Directory to the repository root. Verify the root package is `hestiva-os`, workspaces include `apps/*`, and the build command is exactly `npm run build --workspace @hestiva/api`. Confirm the lockfile and workspace package are present in the deployed commit, then redeploy.

### Railway healthcheck failure

Inspect build, migration, startup, and crash logs in that order. Confirm start command `npm run deploy:api`, health path `/api/v1/health`, required runtime variables, and the platform-provided `PORT`. Test the endpoint directly. If startup regressed, redeploy the prior known-good commit after checking migration compatibility.

### Prisma P1001

P1001 means Prisma cannot reach the configured database. Check Supabase project status first, then verify `DATABASE_URL` is present in Railway and was sourced from the correct project's connection settings. Check connection routing/network restrictions and retry after the database is available. Never print the URL. Avoid repeated deploy loops while Supabase is unavailable.

### Paused Supabase project

Confirm the production project is paused in Supabase, restore it through Supabase controls, and wait until database, Auth, and Storage report available. Recheck Railway migrations and health, then frontend login and storage. If restoration changes connection details, recover values using the safe procedure in the [environment guide](ENVIRONMENT.md#safely-recover-supabase-configuration).

### Missing Cloudflare build variables

Compare configured names with the [build inventory](ENVIRONMENT.md#cloudflare-native-build). Recover authoritative Supabase values from the selected Supabase project and API endpoints from the deployed Railway service. Add them to Cloudflare's protected production native-build configuration, then rebuild; runtime-only edits do not update `NEXT_PUBLIC_*` browser bundles. Do not add public build variables to Wrangler merely to bypass build validation.

### Worker runtime variables disappear

Confirm the deployment targeted `hestivaos` and used the intended `apps/web/wrangler.jsonc`. The checked-in `keep_vars: true` policy preserves deliberately dashboard-managed runtime variables while Wrangler continues to own repository-declared bindings such as `API_URL`. Inspect Cloudflare audit and deployment history for another controller or a deployment using stale configuration. Do not repair a missing browser value solely in Worker runtime settings; restore it in the production build environment and rebuild.

### Frontend cannot reach API

For a browser request that stops after OPTIONS, inspect the response for the exact frontend `Access-Control-Allow-Origin`, allowed method, and `Authorization`/`Content-Type` headers. Confirm Railway's comma-separated `CORS_ALLOWED_ORIGINS` contains the approved Cloudflare origin; startup normalizes separator whitespace and trailing slashes but does not permit arbitrary origins. Then test Railway `/api/v1/health` directly. Compare `API_URL` (server rendering) and `NEXT_PUBLIC_API_URL` (browser calls) with the current Railway endpoint; the existing hostname legitimately contains legacy `mmapi`. Check browser network errors, Worker/Railway logs, TLS, and `CORS_ALLOWED_ORIGINS`. Correct the failing scope and rebuild if a public build-time variable changed.

### API is live but not ready

Request `/api/v1/health` first. If it returns HTTP 200 but `/api/v1/ready` returns HTTP 503, inspect the readiness `checks` values without exposing configuration values:

1. For `database: "unavailable"`, verify Supabase PostgreSQL availability, Railway networking, and the protected `DATABASE_URL`, then retry readiness.
2. For `supabase: "unavailable"`, verify Supabase Auth availability and that a complete supported URL/key pair is configured in Railway. A partially configured pair is intentionally unready. Never print the key.
3. `supabase: "not_configured"` means neither supported pair is present and does not fail readiness; compare this state with the intended environment inventory before changing configuration.
4. Avoid routing dependency-requiring traffic to an instance until readiness returns HTTP 200.

### Trace a failed API request

Capture the `X-Request-ID` response header from the failing client request, or supply a safe identifier using that header when reproducing. Search Railway's JSON logs for the exact request ID. The completion record identifies method, path, response status, and duration; a matching error record identifies endpoint, environment, and stack trace. Do not add authorization headers, request bodies, query strings, tokens, or configuration values to incident records. If an inbound request ID is missing or invalid, the API generates a UUID and returns it in the response.

### API repeatedly fails during startup

Search Railway JSON logs for `startup_failed`. Use its stack trace and environment name to diagnose the failure without copying protected values. A healthy start emits `startup_complete` with version, environment, duration, port, and `status: "started"`; then verify both monitoring endpoints. Absence of the success record indicates startup did not finish.

## Verification checklist

- [ ] Correct `main` commit is deployed by each active authority.
- [ ] Supabase database, Auth, and Storage are available.
- [ ] Railway `/api/v1/health` returns HTTP 200 with status, uptime, version, and timestamp.
- [ ] Railway `/api/v1/ready` returns HTTP 200 with healthy process and dependency checks.
- [ ] A response `X-Request-ID` matches its structured request log record.
- [ ] Cloudflare Worker serves a normal page without HTTP 500.
- [ ] Server-rendered and browser-side API calls succeed.
- [ ] Login/session refresh succeeds.
- [ ] A representative Storage read succeeds.
- [ ] Cloudflare native Git remains the only active web controller.
- [ ] No values or credentials were copied into Git or incident records.

### Profile or Admin Settings authorization is incorrect

Confirm Supabase Auth returns the expected authenticated identity, then inspect the matching application User record by `authUserId` without exposing credentials. `/admin/settings` intentionally requires the exact `ADMIN` application role; `OPERATIONS_MANAGER`, `DISPATCHER`, `SUPERVISOR`, and `TECHNICIAN` must be redirected to the dashboard. If profile password changes fail, inspect the Supabase Auth response and session validity; do not add a database password field or route password values through the Hestiva API. Email is intentionally read-only until a verified email-change flow is delivered. Profile photo recovery continues to use `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET`, falling back to `profile-images`.

If the Auth UUID is absent from `users` after an Auth identity was deleted and re-created, compare the normalized email using trusted server-side Auth data. Synchronization automatically re-associates exactly one matching application user only when Supabase reports `email_confirmed_at`; it preserves the application user ID and its operational references. An unverified match, multiple case-insensitive matches, or a UUID/email conflict returns a controlled account-recovery error. Use identifier-only server log events (`auth_identity_reconciled`, `auth_identity_reconciliation_denied`, or `auth_identity_reconciliation_conflict`) to diagnose it; never log tokens, cookies, headers, passwords, or secrets. Do not delete either the application user or operational records. Administrative resolution of ambiguous states remains deferred to Product Slice 3.

For confirmation-link recovery, verify the Supabase Dashboard Site URL is the canonical Hestiva OS origin and the redirect allow-list accepts `/auth/confirm` on the intended origin. The application derives this callback from the active browser origin and does not hard-code a production or temporary Worker URL.

## Employee Records migration recovery

Before deploying Slice 5, retain the normal verified database backup. If application rollout fails after the additive migration, roll back the application first; the unused table is backward-compatible with the prior release. Do not drop `employee_records` while investigating and never delete or recreate User or Technician rows. If a database rollback is explicitly authorized and all Employee Records data has been exported or confirmed disposable, remove the two foreign keys, table, then `EmployeeStatus` enum; record the operation and redeploy the prior application. Incorrect User/Technician links should be set to null and reconciled from authoritative records rather than guessed. Inactive employees must be retained instead of deleted.

## Controlled business-list recovery

For Slice 5B, restore `business_list_options` together with `employee_records` so lookup IDs and readable labels remain consistent. Do not delete inactive referenced options or mass-map legacy `job_title`/`department` strings. After restore, verify active options appear for new Employee selection, inactive options remain available to ADMIN management and existing linked records, and legacy unlinked strings remain unchanged.

## Property Type recovery

Restore `business_list_options` and `properties` consistently so optional Property Type IDs retain their labels. Do not delete inactive referenced options or infer classifications from names and addresses. The nullable Slice 5C column is backward-compatible with the prior application; roll back application code first and leave the additive schema in place while investigating.

## Recovering from ADMIN Customer Data Cleanup

Customer Data Cleanup is intentionally irreversible and exists for test/admin scenario reset. Before using `/admin/settings/customer-data-cleanup`, verify the selected Contact name and authoritative impact counts. The exact Contact name must be typed and the API independently requires exact ADMIN authorization and confirmation. The transaction either deletes the complete owned database tree or rolls back; normal Customer deletion remains the appropriate protected workflow outside explicit cleanup.

A successful cleanup cannot be restored by the application. Restore from an approved database backup only under the existing Supabase recovery process, assessing the blast radius before recovery. The cleanup preserves shared Shift rows but detaches their deleted Work Order link. It deletes WorkOrderPhoto metadata without deleting Supabase Storage objects because no safe object-deletion service exists; use existing Storage administration procedures to review reported possible orphans by retained operational records and backups, never by guessing paths or bulk-deleting a bucket. Server logs expose actor User ID, Customer ID, counts, and timestamp only.

## Work Order reference recovery

Restore `work_orders`, `services`, and `work_order_daily_counters` from the same consistent backup. Do not reseed a counter downward, fabricate references for nullable historical rows, or derive sequence from row counts. After migration deployment, verify reference uniqueness, the current Africa/Johannesburg counter, legacy-title fallback, and canonical Service links. If a daily sequence reaches 9999, creation intentionally fails; investigate volume rather than resetting or reusing references.

## Accepted-quote Work Order recovery

Restore `work_orders`, `work_order_add_ons`, and `services` from one consistent backup. Preserve nullable frequency/home-condition values and do not infer `ONE_TIME` or any condition for historical jobs. Never delete a canonical Service while removing an add-on relationship. After recovery, verify primary and add-on type boundaries, inactive historical relationship readability, custom-note validation, and the unchanged Johannesburg Work Order reference counter. Property details and access notes remain Property-owned and must be restored with Properties rather than reconstructed on Work Orders.

## Property operational profile recovery

If Property create/update fails after Slice 5J, confirm migration `20260812120000_property_operational_profile` is applied and regenerate Prisma Client. Compare submitted controlled values with the schema enums; do not replace rejected values with fabricated defaults. Verify historical rows remain readable with null profile columns and that Province values remain unchanged. For an unexpected disclosure, use `GET /properties/selector-options` and confirm its response contains only identifying fields; operational notes are expected only in authorized full Property and Work Order responses. Work Orders read live Property data, so correct the Property record or place a one-visit exception in existing Work Order instructions rather than copying persistent notes.

## Service availability and reconciled add-on recovery

Restore `services`, `work_orders`, and `work_order_add_ons` from one consistent backup. Migration `20260810233000_service_availability_and_addon_reconciliation` adds the `BOTH` enum value, updates only the two named canonical capability records, and inserts fixed approved add-ons without changing Work Order rows. If rollout fails, roll back application code first; do not duplicate a `BOTH` capability into separate primary/add-on records or infer unresolved website values. After recovery, verify Interior Window Cleaning and Laundry Folding appear in both active selectors, primary/add-on validation remains enforced, inactive historical selections remain readable, and Work Order references are unchanged.

## Property vocabulary compatibility (2026-08-10)

After restore, verify the four nullable Property columns and their PostgreSQL enum types exist. Never infer Estate, Complex, or Gated community from a legacy `is_estate_or_complex = true`, and never convert `THREE_PLUS` to `THREE` or `FOUR_PLUS` without authoritative correction. A rollback must preserve the legacy columns/states and should not drop newly recorded enum data.

## Recurring service migration verification (2026-08-11)

For migration `20260811190000_recurring_service_agreements`, first use `prisma migrate status` and read-only catalogue inspection. A healthy database contains `recurring_service_agreements`, `recurring_service_agreement_add_ons`, nullable `work_orders.recurring_agreement_id`/`recurrence_date`, and the unique occurrence index. Do not resolve a failed row as applied unless every object and constraint is proven present. Generated Work Orders must be retained during agreement pause/cancel recovery; normal lifecycle actions never delete them.
## 2026-08-13 22:25 SAST — Local JWT verification recovery

HestivaOS API authentication uses local ES256 verification of Supabase access tokens against the project's public JWKS. The verified production Supabase signing configuration is ECC P-256.

If authenticated API requests begin failing after an authentication or signing-key change:

1. Confirm the production Supabase project still uses an asymmetric ECC P-256 / ES256 signing key.
2. Confirm Railway has the correct `SUPABASE_URL` for the production Supabase project.
3. Confirm the public JWKS endpoint is reachable at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`.
4. Do not copy a Supabase private signing key, JWT secret, service-role key, or other privileged credential into HestivaOS.
5. Check API logs for authentication failures without logging bearer tokens or key material.
6. If Supabase signing keys were recently rotated, restart/redeploy the Railway API if immediate cache clearing is required. Otherwise the in-process JWKS cache expires after ten minutes, and an unknown token `kid` also causes one forced JWKS refresh.
7. Verify authentication with a legitimate Supabase session and then verify that HestivaOS application authorization still enforces ACTIVE user status and route roles.
8. If JWKS retrieval or cryptographic verification fails, keep authentication fail closed. Do not temporarily bypass signature, issuer, audience, expiry, subject, or application-user validation to restore access.

A deliberate migration away from ES256 requires a reviewed code change, tests, ADR update, deployment/recovery documentation, and production verification before changing the Supabase signing algorithm.

### Accepted Quote operational-context verification (2026-08-16)

After migration recovery, verify an accepted Quote links to exactly one initial Work Order, that its accepted-revision stored photos have `work_order_quote_evidence` rows, and that the Work Order retains the structured visit context. For recurring Quotes, verify stable instructions/time/eco preference on the agreement and initial visit. Never reconstruct missing temporary credentials from Property notes or copy them to later visits; recover credential metadata only from an authorized source and revoke unusable records.

### ADMIN Quote decision UI recovery (2026-08-16)

If an Admin sees an acceptance timeout or connection failure, do not repeatedly press Accept or issue the mutation manually. Reload the protected Quote detail and inspect its authoritative status and links. `ACCEPTED` with a Work Order link confirms completion; a recurring Quote must also link its agreement. If it remains `SUBMITTED`, reload preflight and review the same current revision before a deliberate retry. Any changed revision, terminal status, missing link, or incompatible accepted state must be investigated through the Quote activity and database linkage rather than repaired in the browser. Never expose temporary credential secrets, bearer tokens, or raw activity metadata while diagnosing the UI.

## 2026-08-17 Work Order Technician assignment recovery

Deploy `20260817120000_work_order_technician_assignments` before the assignment-aware API. It creates only the normalized join and index, then copies every non-null historical `work_orders.technician_id` into it without changing the legacy column, Crew membership, Quote, recurrence, Customer, or Property data. Verify migration completion; compare legacy non-null assignments against matching join rows; smoke-test zero, one, and multiple assignments; confirm duplicate insertion fails; confirm ADMIN authorization and inactive-person rejection. During application rollback, retain the additive join and its backfilled history. Do not derive or refresh saved assignments from current Crew membership.

## 2026-08-17 Crew and Job Leader recovery

Deploy `20260817160000_crew_and_job_leaders` after `20260817120000_work_order_technician_assignments`. Verify every non-null `job_leader_id` names a Technician present in the same Work Order's normalized assignment set. A null leader is expected for Unassigned Work Orders and may identify a legacy multi-Technician row requiring explicit Admin resolution; never guess historical leadership. Application rollback may retain the additive column, index, foreign key, and activity enum. Do not refresh saved Work Orders from current Crew state.

## Homent Technician Start Job recovery

The 20260817190000 migration is additive: existing rows retain null start fields and no historical start is invented. If deployment must be rolled back before field use, roll back application code first; retain the nullable columns and enum value because PostgreSQL enum removal and dropping audit facts are destructive. For a queued-operation conflict, do not delete the device fact or rewrite server state: verify assignment, Job Leader, Work Order lifecycle, `updatedAt`, operation UUID, `startedAt`, and the single `JOB_STARTED` activity before resolving. Never request access credentials from the generic offline cache.

## Execution Scope and offline checklist recovery

Do not repair a stale offline outcome by editing current section columns directly. Retain the queued operation and compare its operation ID, scope revision ID, section ID, expected section version, Technician, and field timestamp with append-only outcome history. Duplicate operation IDs are safe retries; conflicting versions require an explicit field refresh/correction. Never change `started_scope_revision_id` to a newer revision after commencement. Evidence may be removed locally only after authoritative `SERVER_ACKNOWLEDGED`; the full transport is currently deferred.

## Offline Execution Evidence recovery

For a photo showing **Upload pending** or **Upload retry pending**, keep the IndexedDB `evidence` row and Blob. Reconnect and retry with the same evidence UUID and deterministic `<work-order>/<scope-revision>/<section>/<evidence-id>.webp` path; do not mint a replacement identity merely because upload or acknowledgement returned an uncertain result. Object upload without backend acknowledgement is not complete. The idempotent acknowledgement endpoint returns the existing authoritative row after a lost response.

If assignment or started-scope authority was removed, do not attach the Blob elsewhere or delete it: preserve it on the device and escalate for support/reconciliation. Quota errors mean capture was not saved and the checklist must remain unsatisfied. Housekeeping may clear only Blob bytes for `SERVER_ACKNOWLEDGED` rows, in bounded batches; metadata remains. Confirm the database row has the expected Work Order, revision, section, Technician, purpose, storage path, and acknowledgement timestamp before manual device cleanup.

## Homent Technician completion recovery

A device showing **Completed · Sync pending** owns a durable `COMPLETE_JOB` operation; do not reopen the checklist or mint a replacement UUID. Restore connectivity and retry the same operation after queued outcomes. Evidence uploads may continue independently. If the device shows **Completion needs review**, preserve its operation and evidence: assignment, leadership, scope, lifecycle or authoritative readiness changed and management must investigate. The server remains unchanged until acceptance and has no `COMPLETED_OFFLINE` status. Customer correspondence remains blocked until an ADMIN or SUPERVISOR acknowledgement stores its actor/time and eligibility timestamp; acknowledgement itself does not deliver a message.

## Work Order access-readiness recovery

If an access attention item is unexpectedly open, inspect the Work Order controlled readiness and operational status, then use the ADMIN/SUPERVISOR Work Order panel to record the truthful state. Reconciliation will resolve or reopen the stable attention condition and retain occurrence history. Correct mistakes with another readiness transition; never delete readiness events, edit lifecycle status merely to hide attention, or put temporary credentials in notes. Migration failure is handled by fixing the evidenced database condition and rolling the additive migration forward.

## Phase 3B protected credential recovery (2026-08-18)

Preserve `TEMPORARY_ACCESS_CREDENTIAL_ENCRYPTION_KEY` in the approved deployment secret manager and recovery inventory. Database restoration without the matching key retains history but cannot decrypt protected text; do not replace the key as a troubleshooting step. Restore private attachment objects with their unchanged paths. Correct lifecycle mistakes through review/revocation and Phase 3A compensating readiness transitions, never by deleting credential/event rows. Key rotation requires a separately reviewed re-encryption operation; none is supplied by Phase 3B.

## Phase 3C access escalation recovery (2026-08-19)

If access priority or resolution appears wrong, verify the authoritative Work Order schedule and readiness, then verify Phase 3B credential review/revocation/validity metadata through the ADMIN-only credential surface. Correct those facts through existing authorized actions and read Needs Attention again. Reconciliation will update, resolve, or reopen the stable condition. Never edit attention rows/history, expose credential contents, invent a timer, or alter Work Order lifecycle/staffing to repair the display.

## Phase 3D access recovery (2026-08-19)

For an uncertain outbound result, retry with the original recovery request UUID; never create a replacement merely because the response was lost. The canonical adapter receives the same idempotency key. For duplicated webhooks, preserve the existing provider-event record. Do not manually relink a response across conversations or Work Orders. If access facts changed after sending, the candidate command intentionally stops: review current readiness and initiate a new human-authorized request only if still eligible. Never repair recovery by editing message bodies, source provenance, Needs Attention rows, Work Order lifecycle, or Finance. Restore private messaging/temporary-access objects without making paths public.

## Phase 4A Work Order incident recovery (2026-08-19)

Preserve queued `REPORT_INCIDENT` operations and `INCIDENT_EVIDENCE` Blobs with their original UUIDs. Retry rather than minting replacements; conflicting operations remain `NEEDS_REVIEW`. Never repair an incident by editing its original row/evidence, Work Order status, checklist outcome, interruption, scope mismatch, or Needs Attention row. Correct management lifecycle with an append-only review/reopen action. Restore incident, review, and evidence rows together; application rollback may retain the additive schema.

## Private Execution Evidence read recovery (2026-08-19)

If authorized evidence access is unavailable, confirm the API has the correct Supabase project URL, protected service-role credential and private bucket name, then verify the evidence is server-acknowledged and bound to the requested Work Order. Do not make the bucket public, copy a raw path into notes, or weaken role/assignment checks. Rotate a suspected exposed service-role key in Supabase and Railway, restart the API, and verify broad projections and logs contain neither the key, object paths nor signed URLs. A restored database and bucket must retain matching evidence rows/objects and provenance.

## Technician completion correction verification (2026-08-19)

After migration recovery, verify correction rows and linked outcome events remain present, the partial active-correction uniqueness index exists, completed Work Orders remain `COMPLETED`, and original completion/acknowledgement snapshots are intact. Do not delete correction/outcome history or restore acknowledgement fields from a correction snapshot automatically; use the canonical management acknowledgement after corrected resubmission.
