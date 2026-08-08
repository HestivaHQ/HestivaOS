# Technical work log

## 2026-08-08 — Cloudflare environment ownership hardening

- Enabled Wrangler variable preservation while retaining repository ownership of the `hestivaos` Worker configuration and its existing `API_URL` binding.
- Added deterministic production deployment validation for the four required Cloudflare build-variable names. Validation runs before OpenNext builds, reports missing names only, and leaves ordinary local build and development commands unchanged.
- Removed the deploy-capable GitHub Actions frontend workflow so Cloudflare native Git remains the sole automatic frontend deployment authority; the pull-request quality gate remains verification-only.
- Completed the frontend environment example with optional public Storage bucket names and synchronized architecture, deployment, environment, recovery, planning, and decision records.
- Preserved Railway and Supabase configuration, application business logic and authentication behavior, Prisma schema, and migrations.

## 2026-08-07 — Clean-install Prisma Client bootstrap

- Moved Prisma Client generation to the root npm `postinstall` lifecycle so both `npm ci` and `npm install` prepare `@prisma/client` types before workspace typecheck, build, or tests run on a clean checkout.
- Removed generation from the API build command so one dependency bootstrap does not regenerate the same client during root and independent API builds. The API build remains `nest build`; explicit generation remains available as root `npm run db:generate`.
- Renamed the PR workflow install step to expose its bootstrap responsibility while retaining the Node.js 24, non-deploying verification sequence.
- Preserved the Prisma schema, migrations, application behavior, authentication, Supabase integration, and deployment topology.

## 2026-08-07 — Phase 1 API tests and pull-request quality gates

- Added deterministic Jest coverage for API liveness metadata, database and optional Supabase readiness outcomes, request-ID propagation/generation, response correlation, and structured request log fields. Database and Supabase behavior is mocked; the suite does not depend on production services.
- Established a passing root `npm test` baseline through the existing workspace sequence. The API runs real Jest tests; the web workspace retains its explicit no-tests command until web test tooling is intentionally introduced.
- Replaced the standalone documentation-policy workflow with a non-deploying pull-request quality workflow for `main`. On Node.js 24 it uses `npm ci`, documentation validation, a tracked-file secret scan, root typecheck/build/test, independent API/web builds, and `git diff --check`.
- Preserved business logic, authentication, Prisma schema and migrations, Supabase configuration, Railway deployment, Cloudflare native deployment authority, and the disabled frontend deployment workflow.

## 2026-08-07 — Phase 1 API monitoring and operational hardening

- Split API monitoring into lightweight `GET /api/v1/health` liveness metadata and `GET /api/v1/ready` process, database, and configured Supabase Auth connectivity checks. Readiness returns HTTP 503 when a required dependency check fails without returning configuration values.
- Added safe request-ID propagation/generation, response correlation headers, structured JSON request completion and error records, and structured startup success/failure records. Logs exclude query strings, headers, bodies, credentials, and environment-variable values.
- Preserved Railway's `/api/v1/health` health-check path, deployment topology, authentication behavior, business logic, Prisma schema, migrations, and environment-variable inventory.
- Updated architecture, deployment, recovery, planning, and historical documentation with endpoint contracts and operational diagnosis workflows.

## 2026-08-07 — Railway API startup migration cleanup

- Removed the duplicate `prisma migrate deploy` invocation from the `@hestiva/api` start script. Railway continues to invoke the root `npm run deploy:api` command, which runs `db:migrate:deploy` once before starting the API workspace.
- Preserved the Railway build command, health check, root deployment entry point, Prisma schema and migrations, environment variable names, and the NestJS `node dist/main.js` process start.

## 2026-08-07 — Repository documentation policy

- Established the root `AGENTS.md` as the mandatory repository-wide Definition of Done and documentation update matrix for future Codex implementations.
- Added a pull-request consistency workflow and repository-local validator that reports meaningful implementation changes lacking a `docs/` update while excluding Markdown-only, comment-only, and license-only changes.
- Accepted ADR-0008 and documented the policy, historical preservation rules, PR evidence, and limits of automated enforcement.

This is the durable, detailed record of the Hestiva OS migration and production recovery. The six recovery commit identifiers below are preserved exactly even though they are not present in this checkout's reachable Git object set.

## Migration and recovery sequence

1. **`93ffb8f579ff821e8db8b3636a3419835404ef35` — initial recovery baseline.** Recovery work established a known source state and began reconciling repository identity and deployed services. The production stack was treated as three dependencies—Cloudflare web, Railway API, and Supabase—rather than attempting application changes before infrastructure health was understood.
2. **`52a9a1da92e438c518e874eeae56f60cb3a61387` — Railway workspace/build recovery.** The API deployment was aligned to the monorepo root so npm could resolve `@hestiva/api`. The verified build became `npm run build --workspace @hestiva/api`; the API remained a NestJS Railway service and its health contract remained `/api/v1/health`.
3. **`5b2670cec3e370b82489594d20b960fffe2f9549` — Railway startup and database recovery.** API startup was aligned to `npm run deploy:api`, ensuring Prisma migrations precede the process. Supabase database connectivity and environment configuration were recovered without committing values. The resulting known debt is that migrations execute twice: the root deploy script and API workspace start script both invoke deployment migrations.
4. **`dca46d1feba07445fde4eba66d73b52d79350ef5` — Cloudflare/OpenNext recovery.** The Next.js workspace was restored to an OpenNext Cloudflare Worker deployment, with the Worker identity `hestivaos`. Server and browser API configuration were separated through `API_URL` and `NEXT_PUBLIC_API_URL`, and required Supabase build variables were restored in the deployment environment.
5. **`ad4a9eb8b8c02c8ef105a3c7d4ab25d7971912eb` — deployment authority consolidation.** Cloudflare native Git builds were selected as the active web controller. The duplicate GitHub Actions Cloudflare workflow was disabled at the control plane, Railway web automatic deployments were disabled, and the Railway web service was retained temporarily for rollback only.
6. **`82462a6f76bb15c7e162c16d12439913654f06a1` — verification and stabilization.** Web/API reachability, Railway health, and recovered environment scopes were validated. Remaining debt was recorded rather than hidden: legacy `mmapi` in the Railway API hostname, double Prisma migration execution, absent API tests causing `npm test` to fail, and outstanding dependency review.

## Repository cleanup and review history

- **PR #34** performed the Hestiva OS technical cleanup and branding consolidation. It established the `hestiva-os`, `@hestiva/api`, and `@hestiva/web` identities and removed active legacy naming where safe without renaming the live Railway hostname.
- **PR #37** performed the repository-wide legacy naming audit and follow-up cleanup. It retained compatibility-sensitive production references intentionally and corrected local Hestiva OS database example naming.

Subsequent repository commits also corrected the Cloudflare deployment working directory and renamed the checked-in Worker configuration to `hestivaos`. The production conclusion remains: GitHub `main` is source, Cloudflare native Git owns web deployment, Railway owns API deployment, and Supabase owns database/Auth/Storage.

## Known state after recovery

- Railway API Root Directory is the repository root; build and start commands are documented in [Deployment](DEPLOYMENT.md).
- Cloudflare native Git builds are active. The GitHub Actions deployment path and Railway web automatic deployments are disabled.
- Railway web remains rollback-only and must be removed after confidence and rollback planning permit.
- Values were recovered into platform configuration, not committed.
- `npm test` fails because the API has no tests; this is known work, not a passing baseline.
- Dependency vulnerability review, monitoring, backups, controller cleanup verification, hostname migration, and account identity cleanup remain open.
