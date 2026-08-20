# Prisma connection exhaustion incident — 2026-08-20

## Summary

HestivaOS authentication failed after Supabase PostgreSQL exhausted normal connection slots. Supabase Auth password-grant and user-fetch requests returned HTTP 500 with PostgreSQL `SQLSTATE 53300` (`remaining connection slots are reserved for roles with the SUPERUSER attribute`). The failure was not an invalid-password result.

Repository inspection established an application-side amplification path: `PrismaService` was registered independently in the root Nest module and many feature modules. Because `PrismaService` extends `PrismaClient`, each provider instance could own an independent Prisma connection pool in the same Railway API process.

## Correction

The API now has one global `DatabaseModule` that owns and exports the sole process-local `PrismaService`. Feature modules consume that provider without re-registering it. A regression test prevents module-level `PrismaService` registrations from returning.

No schema, migration, customer data, Supabase identity, credential, or authentication policy is changed by the correction.

## Production recovery verification

After the corrected Railway API revision replaces all older API processes:

1. Confirm Supabase Auth password-grant/user-fetch requests no longer fail with SQLSTATE 53300.
2. Confirm `/api/v1/ready` is healthy.
3. Confirm an existing authorized user can sign in with the unchanged credentials.
4. Confirm a harmless authenticated API read succeeds.
5. If connection exhaustion remains, inspect actual PostgreSQL sessions and other legitimate clients/replicas before changing database limits or connection strings.

Do not reset user passwords or rewrite identity/application access state as a response to SQLSTATE 53300.

See `DATABASE_CONNECTION_OWNERSHIP_V1.md` and ADR-0085.
