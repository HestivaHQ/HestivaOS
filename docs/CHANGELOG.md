# Changelog

Notable engineering and operational changes are recorded manually here. Add new entries in reverse chronological order under a `YYYY-MM-DD` heading, grouped as Added, Changed, Fixed, Removed, Security, or Known issues as appropriate.

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
