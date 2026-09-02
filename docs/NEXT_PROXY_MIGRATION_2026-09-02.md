# Next.js proxy migration compatibility finding — 2026-09-02

## Scope

The deferred Next.js 16 `middleware.ts` → `proxy.ts` migration from ADR-0012 was implemented on an isolated branch and validated through the authoritative PR quality gates.

## Finding

Next.js 16.3.4 itself accepted `apps/web/proxy.ts` and completed the application build, but the OpenNext Cloudflare 1.20.2 build then failed with:

`ERROR Node.js middleware is not currently supported. Consider switching to Edge Middleware.`

The failure is architectural rather than application-specific. In Next.js 16, `proxy.ts` always runs on the Node.js runtime and its runtime cannot be configured to Edge. The current OpenNext Cloudflare path used by HestivaOS does not support that Node.js proxy output.

## Production decision

Retain the existing `apps/web/middleware.ts` entrypoint for now.

This keeps the current Edge-compatible deployment path and preserves the established authentication behavior:

- protected routes fail closed when Supabase configuration is unavailable or signed claims are invalid;
- login, `/auth/*`, and public Quote routes remain public;
- authenticated `/login` requests redirect only to a validated local `next` path or `/`;
- Supabase request/response cookie propagation remains unchanged;
- `auth.getClaims()` remains the route-check mechanism;
- the existing matcher remains unchanged.

No runtime authentication behavior is changed by this finding.

## Revisit condition

Retry the migration only after the deployed Cloudflare adapter stack explicitly supports Next.js Node.js Proxy output, or after HestivaOS deliberately changes its deployment architecture. The retry must again pass the full OpenNext/Cloudflare build and a deployed Browser Audit before merge.
