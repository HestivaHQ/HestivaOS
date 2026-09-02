# ADR-0012: Next.js 16 frontend security migration

- **Status:** Accepted
- **Date:** 2026-08-08
- **Related:** ADR-0001 and ADR-0005 remain accepted.

## Context

The verified dependency-security baseline on Next.js 15.5.21 retained high-severity findings in the Next.js, PostCSS 8.4.31, and Next-owned Sharp 0.34.5 families. The supported Next.js 15 line could not move those transitive dependencies to patched families. This made a framework-major migration necessary rather than a routine patch.

A repository audit found one Supabase authentication `middleware.ts`, already-async `cookies()`, already-async dynamic route `params`, a route handler with standard URL search parameters, and client-side search-parameter access. It found no `headers()` or `draftMode()` calls, synchronous request API access, `generateSitemaps`, `next lint`, Next-coupled ESLint configuration, custom webpack configuration or webpack-injecting plugin, runtime config, PPR/dynamicIO APIs, Next image component or custom loader, rewrites, redirects in configuration, or server actions.

## Decision

Pin the web workspace to stable Next.js 16.3.0 and allow Next.js to resolve its own PostCSS 8.5.23 and Sharp 0.35.3 dependencies. Do not introduce direct PostCSS or Sharp dependencies or npm overrides.

Use Next.js 16's default Turbopack build behavior. Do not add `next build --webpack`: the application has no custom webpack configuration, and OpenNext Cloudflare 1.20.2 declares a Next peer range that includes 16.3.0. Preserve OpenNext 1.20.2, Wrangler 4.120.0, Worker configuration, and Cloudflare native Git deployment authority.

Retain `middleware.ts` for this focused migration. Its Supabase cookie refresh and route protection use supported request/response cookie APIs, and renaming it while changing the framework would expand authentication risk. Track migration to the preferred `proxy` convention as follow-up. No source compatibility edits are needed because server cookies and the `[id]` route params are already awaited.

A focused follow-up on 2026-09-02 confirmed that the proxy rename is not currently deployable on the HestivaOS Cloudflare stack: Next.js 16.3.4 emits `proxy.ts` as Node.js middleware, while OpenNext Cloudflare 1.20.2 rejects Node.js middleware output. `middleware.ts` therefore remains the production convention until the adapter stack explicitly supports the Next.js Node.js Proxy path or the deployment architecture changes.

## Consequences

- The lockfile resolves Next.js 16.3.0, PostCSS 8.5.23, and the Next-owned Sharp path to 0.35.3.
- Next.js builds use Turbopack by default; adopting a webpack flag later requires evidence and documentation.
- Next.js reports the retained middleware convention as deprecated, but that deprecation is accepted temporarily because the current Cloudflare adapter cannot deploy the Node.js Proxy output.
- The authoritative GitHub dependency-security diagnostic must confirm the target counts before dependency remediation is declared complete.
- No production deployment is performed by this decision or migration.

## Alternatives considered

Remain on Next.js 15; directly pin or override Next-owned PostCSS or Sharp; select a canary release; upgrade OpenNext or Wrangler without a demonstrated compatibility failure; force webpack pre-emptively; combine the middleware-to-proxy rename with this dependency migration.

## Review trigger

Review if OpenNext or Cloudflare explicitly supports the Next.js Node.js Proxy path, if the HestivaOS deployment architecture changes, if OpenNext or Cloudflare reports a Next.js 16/Turbopack incompatibility, or if a verified vulnerability affects the deployed Next.js 16 line or its resolved graph.
