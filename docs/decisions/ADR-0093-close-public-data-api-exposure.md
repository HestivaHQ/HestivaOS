# ADR-0093: Close direct public-schema Data API access

- Status: Accepted
- Date: 2026-09-02

## Context

HestivaOS already has an authoritative server-side business-data boundary: authenticated clients call the NestJS API, which verifies Supabase identity and applies HestivaOS User status/role authorization before Prisma accesses PostgreSQL. Browser-side Supabase use is for Auth and deliberately controlled Storage flows, not direct business-table CRUD.

The production Supabase project retained legacy automatic grants on public-schema application tables. Because those tables did not have RLS enabled, `anon` and `authenticated` roles had an unnecessary direct Data API path that bypassed the intended NestJS authorization boundary.

## Decision

HestivaOS will treat the Supabase `public` application schema as server-only unless a later ADR deliberately exposes a narrower object.

The launch security migration revokes current table/sequence privileges and function execution from `anon` and `authenticated`, revokes ambient public-schema function execution from PostgreSQL `PUBLIC`, and removes the matching default privileges for future objects created by `postgres`.

We do not add broad RLS policies merely to preserve a Data API surface the product does not use. Any future direct Data API requirement must explicitly grant only required privileges, enable and test RLS where applicable, and document why the operation should not remain behind the NestJS API.

Auth and Storage are separate Supabase product boundaries and are not disabled by this decision.

## Consequences

- Browser possession of a publishable/legacy anon key no longer grants a route to HestivaOS business tables through PostgREST/GraphQL.
- Existing NestJS/Prisma business operations remain on the direct server database connection and do not depend on `anon`/`authenticated` grants.
- Future migrations cannot silently expose new public tables/functions through the legacy default-grant behavior.
- A future feature that intentionally uses direct Data API business access requires an explicit security review rather than an incidental grant.

## Alternatives rejected

### Add permissive RLS policies to every table

Rejected because it would duplicate application authorization while retaining an unnecessary client data path.

### Leave the grants because the app normally uses the API

Rejected because an unused but reachable authorization path is still attack surface.

### Disable Supabase entirely

Rejected because Supabase Auth and Storage remain intentional platform dependencies.

## Review trigger

Review this decision if HestivaOS deliberately adopts direct PostgREST/GraphQL access for a business-domain feature or materially changes its server-side data authority boundary.
