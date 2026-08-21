# ADR-0085: Use one bounded Prisma provider per API process

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

HestivaOS uses NestJS with a `PrismaService` that extends `PrismaClient`. Production Supabase Auth began returning HTTP 500 because PostgreSQL had exhausted normal connection slots (`SQLSTATE 53300`).

Repository inspection showed that the root module and many feature modules each registered `PrismaService` in their own `providers` arrays. Those registrations can produce distinct Nest provider instances and therefore distinct PrismaClient connection pools inside one Railway API process. This multiplied database connection ownership without creating any business value and could starve Supabase Auth and other legitimate database clients.

After that duplicate-provider defect was corrected and production recovered, the remaining single Prisma pool still opened about 26 idle PostgreSQL sessions on the Railway container. The Supabase project reported `max_connections = 60`. Leaving Prisma's environment-dependent default pool size unbounded therefore still consumed too much of the database's total capacity and left insufficient headroom for Supabase platform services, deploy-time migrations, management connections, and overlapping Railway revisions.

## Decision

HestivaOS will own exactly one Nest `PrismaService` provider per API application process, and that provider's Prisma pool will be capped at five database connections.

A global `DatabaseModule` is the sole provider owner. `AppModule` imports that module once, and feature modules consume the exported `PrismaService` without re-declaring it. A regression test scans module source so duplicate Prisma provider ownership fails CI.

`PrismaService` connects lazily rather than calling `$connect()` during Nest module initialization. Its process-local datasource URL is wrapped with `connection_limit=5`; an existing `connection_limit` query value is overridden rather than trusted. Shutdown still disconnects the Prisma client normally.

This decision is process-local rather than deployment-global: intentionally running multiple API replicas still creates one Prisma client/pool per replica, with up to five database connections per replica.

## Consequences

- One API process no longer creates a separate Prisma pool for each feature module.
- One API process cannot silently scale its Prisma pool to the container's CPU-derived default and consume most of the Supabase connection budget.
- Existing services continue to inject `PrismaService` normally; query and transaction semantics are unchanged.
- Process bootstrap and `/api/v1/health` do not require an eager database connection; dependency-aware `/api/v1/ready` still verifies PostgreSQL availability.
- No Prisma schema, migration, database credential, Supabase Auth policy, or public API contract changes.
- New feature modules must not register `PrismaService` locally, and future connection-budget changes require an explicit reviewed code/decision change rather than an incidental container-size change.

## Alternatives considered

### Keep duplicate providers and lower every Prisma pool limit

Rejected. It reduces the symptom but preserves unnecessary independent pools and makes capacity depend on the number of Nest modules.

### Keep one provider but accept Prisma's default pool sizing

Rejected after production verification. The single Railway process opened about 26 idle PostgreSQL connections against a database with a 60-connection ceiling, leaving too little capacity for Supabase and deployment operations.

### Increase PostgreSQL connection limits only

Rejected as the primary correction. It would consume more database capacity while leaving application budgeting implicit and could merely postpone another exhaustion event.

### Depend on a manually edited Railway `DATABASE_URL` query parameter

Rejected as the primary control. The safety boundary belongs in reviewed application code so a missing or accidentally changed platform variable cannot silently remove the cap.

## Review triggers

Review this decision if HestivaOS deliberately introduces separate databases, isolated Prisma clients with materially different connection authorities, sustained query concurrency that demonstrates five connections are insufficient, worker processes that require their own application contexts, or a deployment topology where database pooling is moved to a separately governed proxy/adapter layer.

See `DATABASE_CONNECTION_OWNERSHIP_V1.md` for current operational state and recovery guidance.
