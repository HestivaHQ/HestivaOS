# Deployment

The `20260810220000_canonical_service_catalogue` migration is additive and data-aware. It preserves existing Service IDs and relationships, classifies unambiguous catalogue matches, reconciles the approved Eco alias only when safe, creates missing approved records, and leaves ambiguous or OS-only rows intact. Apply it through the existing `npm run db:migrate:deploy` release path; do not manually delete or reseed production Services.

## Frontend: Cloudflare native Git builds

Cloudflare's native Git integration connected to `HestivaHQ/HestivaOS` is the active and single deployment authority for `@hestiva/web`. A change merged to `main` triggers the configured Cloudflare build, which installs the root workspace dependencies and builds the Next.js application with OpenNext for Worker `hestivaos`.

The frontend is pinned to Next.js 16.3.0 and uses Next.js 16's default Turbopack build behavior. No `--webpack` compatibility flag is configured: the application has no custom webpack configuration, and OpenNext 1.20.2 declares a compatible Next peer range for 16.3.0. The migration did not change Worker configuration or deployment authority.

The Cloudflare production build environment must provide `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The workspace deployment command runs `validate:cloudflare-env` before OpenNext starts and fails with missing variable names only. It never prints values. Optional public Storage bucket names are also build-time configuration when production does not use the application defaults.

`apps/web/wrangler.jsonc` owns repository-declared Worker runtime configuration, including `API_URL`. Its `keep_vars: true` policy preserves deliberately platform-managed runtime variables rather than deleting them during deployment. This preservation policy does not turn Worker runtime variables into build variables: all `NEXT_PUBLIC_*` values needed by browser code must still exist in the Cloudflare production build environment before deployment.

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

Slice 5 adds the additive `20260810120000_add_employee_records` migration. The normal Railway `npm run deploy:api` path applies it before API startup. It creates only the `EmployeeStatus` enum and `employee_records` table, indexes, and nullable `ON DELETE SET NULL` links; it does not update or delete existing Users, Technicians, crews, shifts, or work orders and performs no identity backfill. After deployment, verify Prisma migration completion, API readiness, an ADMIN list request, and non-ADMIN rejection. Do not infer legacy links by matching names, phone numbers, or email addresses.

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

Migration `20260810233000_service_availability_and_addon_reconciliation` now only adds `ServiceType.BOTH`; consecutive migration `20260810233100_service_availability_and_addon_data` uses the committed value, updates Interior Window Cleaning and Laundry Folding by normalized name, and inserts six fixed add-on records with `ON CONFLICT DO NOTHING`. It creates no scope structures or Work Order rows. Production has a failed record for the first name from PR #69, so do not run a routine Railway redeploy until the read-only checks and controlled `migrate resolve` procedure in the recovery guide are complete.

## 2026-08-10 Property vocabulary migration

Apply `20260810180000_property_quote_vocabulary` before deploying this release, then run `npm run db:generate`. The migration is additive: it adds four nullable columns and enum values and deliberately retains `is_estate_or_complex` and `THREE_PLUS`. It performs no data backfill; legacy `true` classifications and `THREE_PLUS` storeys require later manual enrichment when authoritative facts are available.

The timestamp places this migration before `20260812120000_property_operational_profile`, which originally introduced the base bedroom/storey types and columns. Both historical files contain deterministic existence checks so clean lexical replay and an existing database where the profile migration already ran converge without rewriting values. Pull-request PostgreSQL replay must pass both clean and staged modes before deployment.
