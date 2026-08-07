# ADR-0010: Prisma Client generation during repository bootstrap

- **Status:** Accepted
- **Date:** 2026-08-07

## Context

API TypeScript compilation consumes generated declarations from `@prisma/client`. A clean dependency installation did not use the repository's non-default schema path to generate those declarations before the PR workflow ran typecheck. Generation in the later API build command could not prepare an earlier typecheck and repeated whenever API builds were invoked more than once.

## Decision

The root npm `postinstall` lifecycle runs the existing root `db:generate` command. Root `npm ci` and `npm install` therefore generate Prisma Client from `apps/api/prisma/schema.prisma` as the single repository bootstrap step. The API workspace build compiles with `nest build` and does not generate the client again.

## Consequences

- Clean CI, Railway, and local root installs prepare generated Prisma types before workspace commands consume them.
- Root installation requires Prisma generation to succeed, but does not require a database connection.
- Repeated build gates do not repeat Prisma Client generation within the same installed dependency lifecycle.
- Direct workspace commands assume the documented root bootstrap has completed; operators can still run `npm run db:generate` explicitly when intentionally regenerating after a schema checkout or edit.

## Alternatives considered

Generate before every typecheck/build/test command; add a dedicated workflow-only generation step; retain generation only in the API build; commit generated Prisma Client output.

## Review trigger

Review if the schema location, package manager lifecycle, generated-client output strategy, or workspace bootstrap architecture changes.
