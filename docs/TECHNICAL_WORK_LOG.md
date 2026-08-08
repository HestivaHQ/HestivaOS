# Technical work log

## 2026-08-08 — Next.js 16 pull-request validation

- Temporarily extended `.github/workflows/pr-quality-gates.yml` so the existing pull-request-triggered Node.js 24 job runs Cloudflare type generation, the OpenNext build, and a Wrangler dry run immediately after its independent web build. Normal GitHub Actions fail-fast behavior applies to all three additions.
- Preserved every existing quality-gate check and added no dependency, application, configuration, credential, environment, architecture, or deployment change. Wrangler uses the checked-in configuration only with `--dry-run` and writes validation output to `/tmp/hestiva-next16-validation`; no production deployment is possible from the added step.

## 2026-08-08 — Next.js 16 manual validation workflow

- Added `.github/workflows/nextjs16-migration-validation.yml` as a temporary `workflow_dispatch`-only validation path on Node.js 24. It installs the committed lockfile, verifies root-postinstall Prisma Client generation, and runs the requested root, API, web, OpenNext, Cloudflare type-generation, repository documentation, secret, and whitespace checks in order; every required check uses normal fail-fast behavior.
- Constrained Cloudflare validation to `npx wrangler deploy --dry-run` with the checked-in Worker configuration and a temporary output directory. The workflow has read-only repository permission, contains no Cloudflare token or account ID, requires no production secret, changes no environment, and performs no deployment.
- Added a successful-run job summary covering each validation result and production deployment status. Authenticated runtime route testing is explicitly retained as a separate post-build smoke test because this workflow does not receive Supabase credentials. Creating the workflow does not declare the Next.js migration or dependency remediation complete; the separate authoritative dependency-security audit remains required.

## 2026-08-08 — Next.js 16 security migration

- Audited the frontend against Next.js 16 breaking changes before editing it. The application contains a Supabase authentication `middleware.ts`, awaited `cookies()`, awaited dynamic `[id]` params, a route handler using standard `URL.searchParams`, and client-side `useSearchParams`. It contains no `headers()` or `draftMode()` calls, synchronous request API access, `generateSitemaps`, `next lint`, Next-coupled ESLint configuration, custom webpack configuration or injecting plugin, runtime config, PPR/dynamicIO APIs, Next image component or custom loader, configured rewrites or redirects, or server actions.
- Pinned Next.js 16.3.0. Its resolved metadata selects PostCSS 8.5.23 and optional Sharp 0.35.3, replacing Next.js 15.5.21, PostCSS 8.4.31, and the Next-owned Sharp 0.34.5 path. Added no direct PostCSS/Sharp dependency, override, canary, or unrelated framework upgrade.
- Preserved the authentication middleware and its Supabase SSR cookie behavior; no source compatibility edits were required because the relevant async request APIs were already awaited. Recorded migration to the preferred `proxy` convention as separate follow-up.
- Selected default Turbopack behavior and added no `--webpack` flag. The application has no custom webpack behavior, and the locked OpenNext Cloudflare 1.20.2 peer metadata explicitly includes Next.js 16.3.0; Wrangler remains 4.120.0. Worker name, entry, assets, compatibility date and flag, `keep_vars`, `API_URL`, observability, and native Git authority remain unchanged.
- Attempted all requested validation without deploying. The environment runs Node.js 20.20.2 rather than the repository-required Node.js 24 and returned HTTP 403 while `npm ci` fetched PostCSS 8.5.23. The incomplete install prevented Prisma bootstrap, typecheck, builds, tests, OpenNext, type generation, Wrangler dry-run, and route regression testing. Both requested audits also returned HTTP 403, so no local vulnerability counts are recorded. GitHub validation and its authoritative security diagnostic remain required; remediation is not declared complete.

## 2026-08-08 — Dependency Security Remediation PR 2

- Updated the web workspace's existing compatible Wrangler range from `^4.113.0` to `^4.120.0`. Normal npm resolution selected Wrangler 4.120.0, Miniflare 5.20260801.1-alpha, Undici 7.29.0, Miniflare-owned Sharp 0.35.2, and Workerd 1.20260801.1; the Wrangler-owned `@speed-highlight/core` support dependency also moved from 1.2.17 to 1.2.23.
- Confirmed with the installed dependency tree that Sharp 0.35.2 belongs to Miniflare and the remaining Sharp 0.34.5 node belongs only to Next.js 15.5.21. Next.js, PostCSS, OpenNext 1.20.2, Prisma, Supabase packages and configuration, and Railway configuration were not changed. No npm override or direct Miniflare, Undici, Sharp, or Workerd dependency was introduced.
- Built the OpenNext bundle successfully and confirmed `.open-next/worker.js` was generated. Wrangler 4.120.0 accepted the unchanged `apps/web/wrangler.jsonc` in a dry run, including Worker name `hestivaos`, `.open-next/worker.js`, assets binding and directory, compatibility date and `nodejs_compat` flag, `keep_vars`, repository-owned `API_URL`, and observability. Only the environment's proxy-detection warning was emitted; there was no configuration deprecation or changed-semantics warning.
- Started the OpenNext/Wrangler local preview successfully. The local Worker returned HTTP 500 for an application request because protected Supabase build variables are deliberately unavailable in this environment; no values or platform variables were changed. No Cloudflare deployment, dashboard mutation, Railway operation, Supabase operation, or production environment change was performed.
- Both requested registry-backed npm audits returned HTTP 403, so this record makes no claim about verified post-change vulnerability counts. Overall remediation remains incomplete pending the authoritative GitHub Actions audit and separate Next.js, PostCSS, and Next-owned Sharp work.

## 2026-08-08 — Dependency Security Remediation PR 1

- Applied a normal npm lockfile resolution refresh, constrained to the authorized transitive patches: `brace-expansion` 1.1.16 → 1.1.18, 2.1.2 → 2.1.4, and 5.0.7 → 5.0.9; `fast-uri` 3.1.4 → 3.1.5; `js-yaml` 3.15.0 → 3.15.1 and 4.3.0 → 4.3.1; and `nanoid` 3.3.16 → 3.3.18. The resulting lockfile contains none of the vulnerable starting versions.
- Kept `package.json` unchanged, introduced no npm overrides, used neither `npm audit fix` nor `npm audit fix --force`, and made no direct dependency or major-version upgrade. The lockfile diff does not change Next.js, Wrangler, Miniflare, Sharp, Undici, or any unrelated dependency family.
- Registry-backed before and after vulnerability counts were not verifiable in this environment because the npm advisory API returned HTTP 403. This record therefore identifies the removed target versions without estimating counts or claiming that the overall dependency-security programme is complete.
- Wrangler and Cloudflare tooling remediation remains pending. Next.js, PostCSS, and Sharp compatibility investigation remains pending; the remaining Miniflare and Undici work also stays outside this PR.

## 2026-08-08 — Dependency security audit diagnostic

- Added a temporary, manually dispatched Node.js 24 workflow to install the committed dependency graph, verify Prisma Client generation through the root bootstrap, and collect full, production-only, JSON, and outdated-package npm diagnostics without stopping at expected vulnerability exit codes.
- Made each diagnostic exit status visible in the job log and step summary, and retained the JSON audit output as a 14-day workflow artifact when npm produces it.
- Limited the workflow to read-only repository access with no secrets, production credentials, dependency mutation, automatic trigger, or deployment capability. Dependency remediation remains outstanding pending review of the diagnostic results.

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
