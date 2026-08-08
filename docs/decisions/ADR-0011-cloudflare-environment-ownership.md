# ADR-0011: Cloudflare environment ownership and build validation

- **Status:** Accepted
- **Date:** 2026-08-08
- **Refines:** ADR-0005 and ADR-0007; their native Git and single-authority decisions remain accepted.

## Context

The Cloudflare Worker configuration declared `API_URL` through Wrangler while required browser configuration was managed outside the repository. Plain runtime variables added in the Cloudflare dashboard could be deleted by a later Wrangler deployment, and runtime-only edits could not repair `NEXT_PUBLIC_*` values already compiled into browser assets. The retained GitHub Actions workflow also remained structurally capable of deploying despite Cloudflare native Git being the accepted authority.

## Decision

Cloudflare native Git builds from `main` remain the sole automatic frontend deployment authority. Remove the GitHub Actions frontend deployment workflow while preserving the non-deploying pull-request quality gate.

The Cloudflare production build environment owns `NEXT_PUBLIC_*` browser configuration. The production deployment command validates `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before OpenNext builds, reports missing names only, and never prints values. A changed `NEXT_PUBLIC_*` value requires a new build and deployment; a Worker runtime edit cannot change an existing browser bundle.

`apps/web/wrangler.jsonc` owns repository-declared Worker runtime configuration. Enable `keep_vars` so deliberately platform-managed runtime variables can coexist without being deleted during Wrangler deployment, while retaining the repository-declared `API_URL` binding. Do not duplicate `NEXT_PUBLIC_*` values in Wrangler to satisfy their build-time requirement.

Railway continues to own API runtime configuration. GitHub pull-request quality gates verify repository changes without deployment credentials or deployment steps.

## Consequences

- Production deployment fails before OpenNext builds when a required build-variable name is absent.
- Browser-visible configuration remains outside Git and must be configured in Cloudflare's production build environment.
- Wrangler deployments preserve deliberate platform-managed runtime variables, increasing the importance of auditing both the repository declaration and the Cloudflare runtime inventory.
- The repository has no GitHub Actions path capable of deploying the frontend.
- `NEXT_PUBLIC_*` values are public by design and must never contain privileged credentials.

## Alternatives considered

Store public build values in Wrangler; rely on manual dashboard repair after deployment; retain a disabled-but-deploy-capable GitHub workflow; make Wrangler delete all dashboard-managed variables; move API runtime ownership away from Railway.

## Review trigger

Review if Cloudflare native Git cannot provide build-variable controls, if runtime configuration moves fully into versioned declarations, if a second deployment mechanism is proposed, or if Next.js/OpenNext changes its build/runtime environment semantics.
