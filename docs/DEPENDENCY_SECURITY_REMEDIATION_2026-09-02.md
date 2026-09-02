# Dependency Security Remediation — 2026-09-02

## Scope

This note records the focused remediation of the remaining High-severity npm advisory discovered after the Next.js 16.3.4 security patch.

The affected dependency path was:

`prisma` → `@prisma/config` → `deepmerge-ts`

The advisory affected `deepmerge-ts` releases before 8.0.0 and concerned stack exhaustion while merging recursive object graphs.

## Remediation

The repository now applies a root npm override requiring `deepmerge-ts` 8.x. Regenerating the npm lockfile on Node.js 24 / npm 11 resolved the dependency to `deepmerge-ts` 8.0.2.

No Prisma schema, database migration, application-domain behavior, authentication flow, messaging behavior, deployment configuration, or runtime service boundary changed.

## Verification

A branch-scoped GitHub Actions validation regenerated the lockfile and then completed successfully with:

- explicit verification that the resolved `deepmerge-ts` major version is at least 8;
- `npm ci`, including Prisma Client generation;
- `npm audit --audit-level=high`;
- API type-check;
- API tests;
- API build; and
- PostgreSQL migration replay.

Validation run: `33625344152`.

The temporary validation workflow was removed before the final PR diff was frozen.

## Residual posture

This remediation clears the specific Prisma / `deepmerge-ts` High-severity chain identified by the September 2 dependency audit. It does not remove the repository's requirement for periodic authoritative dependency-security diagnostics as dependencies and advisories change over time.
