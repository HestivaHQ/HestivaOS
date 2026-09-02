# Next.js proxy convention migration — 2026-09-02

## Scope

This change completes the deferred Next.js 16 file-convention follow-up from ADR-0012 by replacing `apps/web/middleware.ts` with `apps/web/proxy.ts`.

## Behavior preserved

The migration is intentionally behavior-preserving:

- protected routes still fail closed when Supabase configuration is unavailable or signed claims are not valid;
- login, `/auth/*`, and public Quote routes remain public;
- authenticated `/login` requests still redirect only to a validated local `next` path or `/`;
- Supabase request/response cookie propagation is unchanged;
- `auth.getClaims()` remains the route-check mechanism; `auth.getUser()` is not reintroduced;
- the existing matcher remains unchanged;
- API authorization, canonical HestivaOS User role/status enforcement, post-login `/users/sync`, and authenticated-layout `/users/me` behavior are unchanged.

The only runtime convention change is the Next.js entrypoint name/export: `middleware.ts` / `middleware()` becomes `proxy.ts` / `proxy()`.

## Verification boundary

The navigation/auth architecture test is updated to assert the `proxy.ts` entrypoint and the same fail-closed claims behavior. Full PR quality gates must validate API, web/OpenNext/Cloudflare build compatibility, policy/secrets/diff checks, and PostgreSQL migration replay.

Because this file runs on the authentication/navigation boundary, the deployed HestivaOS Browser Audit must be rerun after merge before the migration is considered production-verified.
