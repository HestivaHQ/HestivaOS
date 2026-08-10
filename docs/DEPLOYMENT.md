# Deployment

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

Pull requests targeting `main` run `.github/workflows/pr-quality-gates.yml` with Node.js 24. The workflow uses `npm ci` at the repository root; its root `postinstall` generates Prisma Client before later commands. It then validates the documentation policy against the pull request base and head, scans tracked files for high-confidence secret formats, runs the root typecheck, root build, and root test commands, builds the API and web workspaces independently, and runs `git diff --check`. The repository currently has no lint script, so this workflow does not invent or run a lint configuration.

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
