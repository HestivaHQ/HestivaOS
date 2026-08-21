# Prisma connection exhaustion incident — 2026-08-20

## Summary

HestivaOS authentication failed after Supabase PostgreSQL exhausted normal connection slots. Supabase Auth password-grant and user-fetch requests returned HTTP 500 with PostgreSQL `SQLSTATE 53300` (`remaining connection slots are reserved for roles with the SUPERUSER attribute`). The failure was not an invalid-password result.

Repository inspection established an application-side amplification path: `PrismaService` was registered independently in the root Nest module and many feature modules. Because `PrismaService` extends `PrismaClient`, each provider instance could own an independent Prisma connection pool in the same Railway API process.

## Correction

The API now has one global `DatabaseModule` that owns and exports the sole process-local `PrismaService`. Feature modules consume that provider without re-registering it. A regression test prevents module-level `PrismaService` registrations from returning.

`PrismaService` also does not eagerly call `$connect()` during Nest module initialization. Prisma opens the process-local pool lazily when the first database-backed operation runs. This keeps the process-only `/api/v1/health` endpoint available during a database outage and prevents a rolling Railway deployment from being unable to pass its healthcheck solely because the older revision is still holding exhausted database connections. `/api/v1/ready` remains the dependency-aware readiness endpoint and still fails closed when PostgreSQL is unavailable.

After the exhausted old Railway deployment was removed, PostgreSQL dropped to 12 total connections. After the corrected API was successfully redeployed, production inspection showed 38 total connections, including about 26 idle connections from the Railway/HestivaOS PostgreSQL client, while the Supabase project reported `max_connections = 60`. The single Prisma provider therefore still needed an explicit application-side pool budget. The process-local datasource is now capped at `connection_limit=5`, overriding any pre-existing URL value.

This rollout note is incident-specific evidence and does not replace the repository's canonical recovery procedure.

No schema, migration, customer data, Supabase identity, credential, or authentication policy is changed by the correction.

## Production recovery verification

After the bounded-pool Railway API revision replaces the previous API process:

1. Confirm the Railway `/api/v1/health` healthcheck succeeds and the corrected revision becomes active.
2. Confirm older API processes are retired so their previous Prisma pools are released.
3. Confirm Supabase Auth password-grant/user-fetch requests no longer fail with SQLSTATE 53300.
4. Confirm the live HestivaOS PostgreSQL client settles at no more than five Prisma pool connections per API process after ordinary traffic has exercised the database.
5. Confirm `/api/v1/ready` is healthy once PostgreSQL capacity has recovered.
6. Confirm an existing authorized user can sign in with the unchanged credentials.
7. Confirm a harmless authenticated API read succeeds.
8. If connection exhaustion remains, inspect actual PostgreSQL sessions and other legitimate clients/replicas before changing database limits or connection strings.

Do not reset user passwords or rewrite identity/application access state as a response to SQLSTATE 53300.

See `DATABASE_CONNECTION_OWNERSHIP_V1.md` and ADR-0085.
