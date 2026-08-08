# Changelog

Notable engineering and operational changes are recorded manually here. Add new entries in reverse chronological order under a `YYYY-MM-DD` heading, grouped as Added, Changed, Fixed, Removed, Security, or Known issues as appropriate.

## 2026-08-08 — OpenNext monorepo validation path

### Fixed

- Corrected both temporary validation paths to invoke OpenNext from the web workspace, where the existing `open-next.config.ts`, Next.js configuration, and Worker build output belong.
- Preserved the existing OpenNext configuration and all checked-in Wrangler settings; no credential, dependency, application, environment, or deployment change was made.

## 2026-08-08 — Next.js 16 pull-request validation

### Changed

- Temporarily extended the existing Node.js 24 pull-request quality gate after its independent web build with Cloudflare type generation, an OpenNext Worker build, and a Wrangler bundle dry run.
- Kept the existing checks unchanged and added no Cloudflare credentials or deployment capability; the Wrangler command requires `--dry-run` and each added validation fails the quality-gate job on failure.

## 2026-08-08 — Next.js 16 manual validation workflow

### Added

- Added a temporary, manually dispatched Node.js 24 workflow that validates the committed Next.js 16 migration through locked installation, Prisma bootstrap, root and workspace checks, OpenNext, Cloudflare type generation, a Wrangler dry run, and repository documentation/security checks.
- Added a successful-run job summary and an explicit reminder that authenticated runtime route testing remains a separate post-build smoke test.

### Security

- Limited the workflow to read-only repository permission, no production credentials, no automatic trigger, and no deployment. Dependency remediation remains pending the separate authoritative security audit.

## 2026-08-08 — Next.js 16 security migration

### Security

- Migrated the web workspace from Next.js 15.5.21 to stable Next.js 16.3.0. Normal Next.js dependency resolution moved PostCSS 8.4.31 to 8.5.23 and the Next-owned Sharp path from 0.34.5 to 0.35.3 without direct pins, overrides, or unrelated framework upgrades.

### Changed

- Retained the existing Supabase authentication middleware because its cookie handling is compatible, while recording Next.js 16's middleware-to-proxy deprecation as follow-up.
- Kept Next.js 16's default Turbopack build strategy. No webpack compatibility flag, Worker configuration change, deployment-authority change, or production deployment was introduced.

### Known issues

- This environment returned HTTP 403 for the PostCSS tarball during `npm ci`, both npm advisory requests, and later npx fallback requests. Consequently Prisma generation, compiled validation, OpenNext/Cloudflare validation, and application route regression testing could not run locally and remain required in GitHub on Node.js 24.
- Dependency remediation is not marked complete. The authoritative GitHub dependency-security diagnostic must confirm the target counts.

## 2026-08-08 — Dependency Security Remediation PR 2

### Security

- Updated the web workspace's Wrangler range from `^4.113.0` to `^4.120.0`, resolving Wrangler 4.120.0 and its supported Cloudflare toolchain: Miniflare 5.20260801.1-alpha, Undici 7.29.0, Miniflare-owned Sharp 0.35.2, and Workerd 1.20260801.1.
- Left Next.js, PostCSS, OpenNext, and the Next-owned Sharp 0.34.5 path unchanged. Added no npm overrides and no direct Miniflare, Undici, Sharp, or Workerd dependency.

### Changed

- Validated the unchanged Worker configuration and generated OpenNext Worker with Wrangler 4.120.0. The Worker identity, entry point, assets, compatibility settings, `keep_vars`, repository-owned `API_URL`, observability, build-variable validation, and Cloudflare native Git deployment authority remain unchanged; no deployment was performed.

### Known issues

- The npm advisory endpoint returned HTTP 403 for both requested local audits, so no after-remediation vulnerability counts are recorded. The authoritative GitHub Actions audit remains pending.
- Overall dependency remediation is not complete. Next.js, PostCSS, and the remaining Next-owned Sharp path still require separate remediation.

## 2026-08-08 — Dependency Security Remediation PR 1

### Security

- Refreshed only the authorized transitive lockfile resolutions: `brace-expansion` 1.1.16 → 1.1.18, 2.1.2 → 2.1.4, and 5.0.7 → 5.0.9; `fast-uri` 3.1.4 → 3.1.5; `js-yaml` 3.15.0 → 3.15.1 and 4.3.0 → 4.3.1; and `nanoid` 3.3.16 → 3.3.18.
- Made no direct dependency or major-version upgrade, left `package.json` unchanged, added no npm override, and did not use `npm audit fix`.

### Known issues

- Registry-backed before/after vulnerability counts could not be verified because the npm advisory API returned HTTP 403; the targeted vulnerable lockfile versions are absent after the refresh.
- Dependency-security remediation is not complete. Wrangler and Cloudflare tooling remediation remains pending, and Next.js, PostCSS, and Sharp compatibility investigation remains pending. The later work also owns the remaining `miniflare` and `undici` dependency families.

## 2026-08-08 — Dependency security audit diagnostic

### Added

- Added a temporary, manually triggered Node.js 24 diagnostic workflow that records npm audit, production-only audit, JSON audit, and outdated-package results without changing dependencies or deploying.
- Added a downloadable 14-day JSON audit artifact and explicit command exit-status reporting for vulnerability-bearing audit runs.

### Known issues

- Dependency review and remediation remain outstanding until maintainers run the workflow and assess its registry-backed results.

## 2026-08-08 — Cloudflare environment ownership hardening

### Added

- Added pre-deployment validation for required Cloudflare production build-variable names and documented build, runtime, and browser configuration ownership.
- Added ADR-0011 for persistent Cloudflare environment ownership.

### Changed

- Enabled Wrangler preservation of deliberately platform-managed Worker runtime variables while retaining the existing repository-declared API binding.
- Expanded the frontend environment example with supported public Storage bucket names.

### Removed

- Removed the old deploy-capable GitHub Actions frontend workflow so Cloudflare native Git is the sole automatic frontend deployer.

## 2026-08-07 — Clean-install Prisma Client bootstrap

### Fixed

- Made root dependency installation generate Prisma Client before clean-runner typecheck, build, and tests, and removed duplicate generation from the API build command.
- Clarified the PR quality-gate install step so Prisma bootstrap failures are diagnosed before typecheck.

## 2026-08-07 — Phase 1 API tests and pull-request quality gates

### Added

- Added deterministic API tests for monitoring endpoints, optional dependency readiness, request correlation, and safe structured request logging.
- Added a Node.js 24 pull-request verification workflow with locked dependency installation, documentation and secret checks, typecheck, builds, tests, and whitespace validation; it performs no deployment.

### Changed

- Consolidated pull-request documentation validation into the broader quality-gate workflow and established a passing root workspace test baseline.

## 2026-08-07 — Phase 1 API monitoring and operational hardening

### Added

- Added lightweight API liveness metadata and dependency-aware readiness endpoints.
- Added structured JSON request, error, and startup logging with request-ID generation and propagation.
- Added operational endpoint contracts, correlation workflow, and monitoring troubleshooting guidance.

### Changed

- Changed `/api/v1/health` from a database-dependent response to a lightweight process liveness response while retaining its route and successful HTTP contract for Railway.

## 2026-08-07 — Railway API startup migration cleanup

### Fixed

- Removed the API workspace's duplicate Prisma migration invocation so Railway's root `deploy:api` path runs deployment migrations exactly once before starting NestJS from `dist/main.js`.

## 2026-08-07 — Repository documentation policy

### Added

- Made synchronized engineering documentation a repository-wide Definition of Done through root Codex instructions and an explicit update matrix.
- Added PR validation that fails documented implementation categories with no `docs/` change and gives human-readable remediation guidance.
- Added ADR-0008 and documented the documentation workflow itself.

## 2026-08-07 — Hestiva OS migration and recovery

### Changed

- Renamed the product and active repository/workspace identities to Hestiva OS.
- Cleaned repository naming and deployment configuration while retaining compatibility-sensitive legacy endpoint references.
- Established Cloudflare native Git builds as the single active frontend deployment authority.

### Fixed

- Repaired Railway monorepo workspace resolution, API build/start configuration, and health checking.
- Repaired the Next.js OpenNext build and Cloudflare Worker deployment configuration.
- Recovered Railway, Cloudflare, and Supabase environment configuration in their protected platform scopes without committing values.

### Known issues

- Railway API hostname retains legacy `mmapi` naming.
- API startup executes Prisma migrations twice.
- Root tests fail because the API currently has no tests.
- Dependency review remains outstanding.
