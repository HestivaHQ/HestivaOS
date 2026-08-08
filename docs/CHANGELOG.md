# Changelog

Notable engineering and operational changes are recorded manually here. Add new entries in reverse chronological order under a `YYYY-MM-DD` heading, grouped as Added, Changed, Fixed, Removed, Security, or Known issues as appropriate.

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
