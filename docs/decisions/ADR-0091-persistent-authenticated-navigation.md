# ADR-0091: Persist the authenticated web shell and separate login reconciliation from navigation

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

Protected office navigation previously executed three avoidable pieces of critical-path work: middleware called Supabase Auth `getUser`, each page called the write-capable `/users/sync` reconciliation route, and each page instantiated its own `AppFrame`. The result prevented Next.js App Router layout persistence and made routine transitions wait for an external Auth lookup and an application-user reconciliation transaction before rebuilding the shell.

Supabase's installed client supports `getClaims()` for cryptographically verified claims with asymmetric signing keys. The API already verifies bearer tokens against Supabase JWKS, resolves the canonical application User, requires ACTIVE status, and applies route role metadata. It also already exposes `GET /users/me`.

## Decision

Protected office routes share one authenticated App Router layout. The layout resolves the current application User through read-only `GET /users/me`, renders the role-sensitive Homent desktop/mobile/account shell once, and nests route content beneath an in-shell loading boundary. Request-scoped React caching deduplicates the authenticated API bootstrap for pages that also require the current User. Root `force-dynamic` is removed; cookie access keeps the authenticated layout dynamic without forcing unrelated public/static work dynamic.

Middleware uses Supabase `auth.getClaims()` instead of `auth.getUser()` for routine route checks. Claims must be cryptographically verified by the installed Supabase implementation; missing configuration, verification errors, malformed claims, and absent subjects fail protected navigation closed. Cookie writes supplied by Supabase remain propagated by middleware.

`POST /users/sync` remains the deliberate post-login/bootstrap reconciliation boundary. Routine protected navigation uses `GET /users/me`; the API guard supplies the already-resolved ACTIVE application User to that read route, avoiding a second database lookup and all reconciliation writes. Application roles continue to come only from the canonical HestivaOS User, never provider claims.

The separately designed Homent Technician shell and public Quote/login routes remain outside the office layout. API authorization remains authoritative even where navigation items or pages apply supplementary role presentation checks.

## Consequences

Warm routine navigation no longer requires Supabase Auth `/user`, no longer starts an identity-reconciliation transaction, and preserves the Homent office shell while route content streams. A cold or rotated signing key can still require JWKS retrieval and fails closed if verification is unavailable.

A login performs reconciliation before entering protected routes. Existing application User existence, ACTIVE status, ADMIN/SUPERVISOR checks, API bearer verification, audit history, and session-cookie propagation remain intact. Data-manager request fan-out and browser-to-Railway topology are intentionally deferred to the next performance lane.
