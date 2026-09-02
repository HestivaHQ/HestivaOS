# Supabase Data API security boundary

## Current authority

HestivaOS business-domain database access is server mediated. The browser authenticates with Supabase Auth and uses Supabase Storage for the deliberately configured Storage surfaces, while operational reads and mutations go through the authenticated HestivaOS NestJS API. The API uses Prisma/PostgreSQL as the business-data boundary and independently enforces application User existence, ACTIVE status and route role authorization.

The Supabase `public` database schema is therefore **not** a supported browser Data API surface for HestivaOS business tables.

## Launch-readiness finding — 2026-09-02

A production readiness inspection found the existing Supabase project still carried legacy default grants on public-schema tables. `anon` and `authenticated` could reach public application tables through the Data API while Row Level Security was disabled. This was an unnecessary second data-access path outside the canonical NestJS authorization boundary.

The repository closes that path with migration `20260902162500_close_public_data_api_exposure`:

- revoke all current public-table and public-sequence privileges from `anon` and `authenticated`;
- revoke current public-schema function execution from those roles and from PostgreSQL `PUBLIC`;
- revoke the corresponding default privileges for future tables, sequences and functions created by `postgres`;
- leave Auth and Storage schemas/buckets outside this migration because their provider-managed access controls are separate from the public application schema;
- leave server-side Prisma/database access unchanged.

This is intentionally stricter than adding permissive RLS policies to every business table. HestivaOS does not currently need browser Data API access to those tables, so the least-privilege boundary is no access rather than duplicating application authorization rules in RLS.

## Verification requirements

Before merge and after production migration deployment, verify:

1. clean/staged migration replay succeeds;
2. `anon` and `authenticated` have no table, sequence or function privileges in `public` unless a later explicit reviewed exception exists;
3. normal HestivaOS login still succeeds through Supabase Auth;
4. authenticated HestivaOS business reads continue through the NestJS API;
5. profile image and Work Order/evidence Storage flows remain governed by their existing Storage policies and are not changed by this public-schema migration;
6. Supabase Security Advisor no longer reports the public business tables as exposed without RLS. `_prisma_migrations` may still be reported as RLS-disabled by a schema-only advisor even when client-role grants are absent; verify effective grants rather than treating RLS alone as the access boundary for a deliberately unexposed table.

## Future rule

Do not grant `anon` or `authenticated` access to a `public` table/function merely to resolve a client error. If a future product genuinely requires direct Data API access, treat that as a security/architecture change: explicitly grant only required operations, enable RLS, add allow/deny policy tests, document the new authority boundary, and review whether the operation belongs behind the NestJS API instead.
