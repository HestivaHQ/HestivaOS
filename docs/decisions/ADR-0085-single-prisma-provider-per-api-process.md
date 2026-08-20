# ADR-0085: Use one Prisma provider per API process

- **Status:** Accepted
- **Date:** 2026-08-20

## Context

HestivaOS uses NestJS with a `PrismaService` that extends `PrismaClient`, connects during module initialization, and disconnects during module destruction. Production Supabase Auth began returning HTTP 500 because PostgreSQL had exhausted normal connection slots (`SQLSTATE 53300`).

Repository inspection showed that the root module and many feature modules each registered `PrismaService` in their own `providers` arrays. Those registrations can produce distinct Nest provider instances and therefore distinct PrismaClient connection pools inside one Railway API process. This multiplied database connection ownership without creating any business value and could starve Supabase Auth and other legitimate database clients.

## Decision

HestivaOS will own exactly one Nest `PrismaService` provider per API application process.

A global `DatabaseModule` is the sole provider owner. `AppModule` imports that module once, and feature modules consume the exported `PrismaService` without re-declaring it. A regression test scans module source so duplicate Prisma provider ownership fails CI.

This decision is process-local rather than deployment-global: intentionally running multiple API replicas still creates one Prisma client/pool per replica.

## Consequences

- One API process no longer creates a separate Prisma pool for each feature module.
- Existing services continue to inject `PrismaService` normally; query and transaction semantics are unchanged.
- No Prisma schema, migration, database credential, Supabase Auth policy, or public API contract changes.
- Restarting/redeploying the corrected Railway API is sufficient to retire connection pools held by old API processes; remaining connection pressure must be diagnosed as actual external/replica/client capacity rather than masked by increasing connection limits blindly.
- New feature modules must not register `PrismaService` locally.

## Alternatives considered

### Keep duplicate providers and lower every Prisma pool limit

Rejected. It reduces the symptom but preserves unnecessary independent pools and makes capacity depend on the number of Nest modules.

### Increase PostgreSQL connection limits only

Rejected as the primary correction. It would consume more database capacity while leaving the application topology defective and could merely postpone another exhaustion event.

### Remove explicit `$connect()` while keeping duplicate providers

Rejected. Prisma can connect lazily, so multiple `PrismaClient` instances would still own independent pools once used.

## Review triggers

Review this decision if HestivaOS deliberately introduces separate databases, isolated Prisma clients with materially different connection authorities, worker processes that require their own application contexts, or a deployment topology where database pooling is moved to a separately governed proxy/adapter layer.

See `DATABASE_CONNECTION_OWNERSHIP_V1.md` for current operational state and recovery guidance.
