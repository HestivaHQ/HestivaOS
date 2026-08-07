# Recovery guide

## Recovery order

1. Stop overlapping deployment actions and identify the failing commit/deployment.
2. Check Supabase project availability, then Railway API health, then Cloudflare build/deployment and Worker logs.
3. Validate configuration names and platform scopes without copying values into logs.
4. Repair the lowest failing dependency first: Supabase, API, then frontend.
5. Redeploy through the single authority and complete the verification checklist.

## Symptom procedures

### Worker returns HTTP 500

Inspect Cloudflare Worker logs and correlate the request with the deployed commit. Check that `API_URL` exists at runtime and that build-time Supabase variables existed in the deployed build. Test Railway `/api/v1/health`. If the API is healthy, reproduce with a known route and roll back the Worker to a known-good deployment if the current code/config build is faulty.

### Cloudflare native build fails

Read the earliest build error. Confirm the build checked out the expected `main` commit, installed from the repository root so workspaces resolve, uses the supported Node/npm versions, and has all [Cloudflare build variables](ENVIRONMENT.md#cloudflare-native-build). Reproduce with `npm install`, web typecheck, and web build locally. Fix forward or retry a transient build; do not activate GitHub Actions.

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

Compare configured names with the [build inventory](ENVIRONMENT.md#cloudflare-native-build). Recover authoritative Supabase values from the selected Supabase project and API endpoints from the deployed Railway service. Add them to Cloudflare's protected native-build configuration, then rebuild; runtime-only edits do not update `NEXT_PUBLIC_*` browser bundles.

### Frontend cannot reach API

Test Railway `/api/v1/health` directly. Compare `API_URL` (server rendering) and `NEXT_PUBLIC_API_URL` (browser calls) with the current Railway endpoint; the existing hostname legitimately contains legacy `mmapi`. Check browser network errors, Worker/Railway logs, TLS, and `CORS_ALLOWED_ORIGINS`. Correct the failing scope and rebuild if a public build-time variable changed.

## Verification checklist

- [ ] Correct `main` commit is deployed by each active authority.
- [ ] Supabase database, Auth, and Storage are available.
- [ ] Railway `/api/v1/health` succeeds and logs show a stable process.
- [ ] Cloudflare Worker serves a normal page without HTTP 500.
- [ ] Server-rendered and browser-side API calls succeed.
- [ ] Login/session refresh succeeds.
- [ ] A representative Storage read succeeds.
- [ ] Cloudflare native Git remains the only active web controller.
- [ ] No values or credentials were copied into Git or incident records.
