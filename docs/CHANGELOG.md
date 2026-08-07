# Changelog

Notable engineering and operational changes are recorded manually here. Add new entries in reverse chronological order under a `YYYY-MM-DD` heading, grouped as Added, Changed, Fixed, Removed, Security, or Known issues as appropriate.

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
