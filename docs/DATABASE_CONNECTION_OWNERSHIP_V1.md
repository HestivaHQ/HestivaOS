# Database connection ownership v1

## Status

Current HestivaOS API runtime contract.

## Production incident evidence — 2026-08-20

Supabase Auth and direct database access began returning PostgreSQL `SQLSTATE 53300` with `remaining connection slots are reserved for roles with the SUPERUSER attribute`. Password-grant requests returned HTTP 500, so the observed HestivaOS sign-in failure was a database-capacity failure rather than an invalid-email/password result.

Repository inspection found that `PrismaService` extended `PrismaClient`, called `$connect()` during Nest module initialization, and was independently registered as a provider in the root module and many feature modules. In Nest, those feature-level registrations can create distinct provider instances; because each `PrismaService` is its own `PrismaClient`, the API process could own many independent Prisma connection pools.

## Current authority

`DatabaseModule` is the sole Nest provider owner for `PrismaService`.

- `DatabaseModule` is global and exports exactly one `PrismaService` provider for the API application context.
- `AppModule` imports `DatabaseModule` once.
- Feature modules inject `PrismaService` where needed but must not register it in their own `providers` arrays.
- `PrismaService` continues to connect on module initialization and disconnect on module destruction. The ownership correction changes provider lifetime/topology, not query semantics, schema, migrations, credentials, or database authority.
- A source-level regression test fails if any `*.module.ts` other than `database.module.ts` contains a `PrismaService` registration/import reference and also verifies that `AppModule` imports `DatabaseModule` first.

This rule is process-local. If Railway intentionally runs multiple API replicas, each replica owns its own single Prisma client/pool; database capacity planning must account for the replica count plus Supabase platform services and other legitimate clients.

## Failure and recovery behavior

If PostgreSQL again reports connection-slot exhaustion, do not reset user passwords, rewrite Supabase identities, disable authorization, or alter application User state merely because login fails. First treat HTTP 500 password-grant/user-fetch failures with SQLSTATE 53300 as database availability/capacity evidence.

After the corrected API revision is deployed, a Railway restart/redeploy releases connections owned by prior API processes and starts the new process with the single-provider topology. Confirm Supabase Auth can complete a password grant/user fetch, HestivaOS `/api/v1/ready` remains healthy, and ordinary authenticated API reads succeed before resuming broader testing.

If connection pressure remains after every old API process is gone, inspect actual PostgreSQL sessions and other clients before changing limits or connection strings. Do not assume HestivaOS is the only connection source. Preserve production data and credentials; this correction requires no database migration and no secret rotation.

## Scope intentionally unchanged

This change does not alter Supabase Auth policy, HestivaOS role/status authority, Messenger/WhatsApp behavior, Quote/Work Order behavior, Prisma schema, PostgreSQL migration history, Cloudflare deployment authority, Railway credentials, or Supabase credentials.

See ADR-0085 for the durable provider-ownership decision.
