# Database connection ownership v1

## Status

Current HestivaOS API runtime contract.

## Production incident evidence — 2026-08-20

Supabase Auth and direct database access began returning PostgreSQL `SQLSTATE 53300` with `remaining connection slots are reserved for roles with the SUPERUSER attribute`. Password-grant requests returned HTTP 500, so the observed HestivaOS sign-in failure was a database-capacity failure rather than an invalid-email/password result.

Repository inspection found that `PrismaService` extended `PrismaClient` and was independently registered as a provider in the root module and many feature modules. In Nest, those feature-level registrations can create distinct provider instances; because each `PrismaService` is its own `PrismaClient`, the API process could own many independent Prisma connection pools.

After duplicate providers were removed and the API was recovered, production inspection showed the remaining single Prisma pool opening about 26 idle PostgreSQL connections on the Railway container. The Supabase project reported `max_connections = 60`, so an unbounded default pool still left insufficient operational headroom for Supabase Auth, PostgREST, migrations, management connections, and overlapping Railway deployment processes.

## Current authority

`DatabaseModule` is the sole Nest provider owner for `PrismaService`.

- `DatabaseModule` is global and exports exactly one `PrismaService` provider for the API application context.
- `AppModule` imports `DatabaseModule` once.
- Feature modules inject `PrismaService` where needed but must not register it in their own `providers` arrays.
- `PrismaService` connects lazily on the first database-backed operation rather than blocking Nest bootstrap with an eager `$connect()` call.
- The HestivaOS Prisma datasource URL is wrapped process-locally with `connection_limit=5`. Any pre-existing `connection_limit` value in the runtime URL is overridden to 5 so one API process cannot silently expand beyond the reviewed application budget.
- `PrismaService` disconnects on module destruction.
- Source-level regression tests prevent duplicate module-level Prisma providers, prevent eager bootstrap connection from returning, and verify the fixed process-local pool limit.

This rule is process-local. If Railway intentionally runs multiple API replicas, each replica may own up to five Prisma database connections. Capacity planning must include the replica count plus Supabase platform services, deploy-time migration sessions, management access, and other legitimate clients.

## Failure and recovery behavior

If PostgreSQL again reports connection-slot exhaustion, do not reset user passwords, rewrite Supabase identities, disable authorization, or alter application User state merely because login fails. First treat HTTP 500 password-grant/user-fetch failures with SQLSTATE 53300 as database availability/capacity evidence.

A Railway restart/redeploy releases connections owned by prior API processes. The process-only `/api/v1/health` endpoint must be able to start without an eager Prisma connection, while `/api/v1/ready` remains dependency-aware and fails closed until PostgreSQL is reachable. Confirm Supabase Auth can complete a password grant/user fetch, HestivaOS `/api/v1/ready` is healthy, and ordinary authenticated API reads succeed before resuming broader testing.

If connection pressure remains after every old API process is gone and each live HestivaOS API process is respecting the five-connection cap, inspect actual PostgreSQL sessions and other clients before changing limits or connection strings. Do not assume HestivaOS is the only connection source. Preserve production data and credentials; this correction requires no database migration and no secret rotation.

## Scope intentionally unchanged

This change does not alter Supabase Auth policy, HestivaOS role/status authority, Messenger/WhatsApp behavior, Quote/Work Order behavior, Prisma schema, PostgreSQL migration history, Cloudflare deployment authority, Railway credentials, or Supabase credentials.

See ADR-0085 for the durable provider-ownership and bounded-pool decision.
