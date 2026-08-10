# Recovery guide

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
