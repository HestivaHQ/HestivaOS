# ADR-0086: Bound the Prisma pool per API process

- **Status:** Accepted
- **Date:** 2026-08-21
- **Supersedes:** none
- **Refines:** ADR-0085

## Context

ADR-0085 established one process-local Prisma provider/pool per HestivaOS API process after production PostgreSQL connection exhaustion. After that topology correction was deployed and the old connection-hungry process was retired, production inspection showed the remaining single Prisma pool could still open roughly 26 idle PostgreSQL sessions on the Railway container. The Supabase project reported `max_connections = 60`, leaving insufficient headroom for Supabase Auth, PostgREST, deploy-time migrations, management access, and overlapping Railway revisions.

A subsequent production recurrence confirmed the risk: PostgreSQL again reached the connection ceiling, with more than 50 idle sessions attributable to the Railway/HestivaOS client, causing internal server errors and `SQLSTATE 53300` / `too many clients already` failures.

## Decision

The sole process-local HestivaOS `PrismaService` will enforce a maximum pool size of five database connections.

`PrismaService` will wrap the runtime `DATABASE_URL` process-locally and set `connection_limit=5`. Any pre-existing `connection_limit` query parameter is overridden to the reviewed value. The external Railway variable itself is not rewritten by this decision.

Prisma remains lazy-started so Nest bootstrap and `/api/v1/health` do not require an eager database connection. `/api/v1/ready` remains dependency-aware. Shutdown continues to call `$disconnect()`.

## Consequences

- One Railway API process may consume at most five Prisma pool connections under this application contract.
- Overlapping deployments and Supabase platform services retain meaningful connection headroom against the current 60-connection ceiling.
- Container CPU sizing can no longer silently increase Prisma's process-local pool budget.
- Existing Prisma queries, transactions, schema, migrations, credentials, Supabase Auth policy, and public API contracts are unchanged.
- Future pool-size changes require an explicit reviewed change and production-capacity evidence.

## Alternatives considered

### Keep Prisma's default pool sizing

Rejected. Production evidence showed the default single-pool size was still large enough to threaten Supabase availability.

### Increase PostgreSQL `max_connections`

Rejected as the primary response. It does not create an explicit application budget and could merely postpone another exhaustion event.

### Set `connection_limit` manually only in Railway

Rejected as the sole boundary. A platform-variable edit can drift or disappear without repository review; the safety limit belongs in versioned application code.

## Review triggers

Review this decision if sustained production concurrency proves five connections inadequate, Railway replica count changes materially, Supabase database capacity changes materially, a governed external pooler becomes authoritative, or HestivaOS introduces additional intentional Prisma clients/processes.

See `DATABASE_CONNECTION_OWNERSHIP_V1.md` and `PRISMA_CONNECTION_INCIDENT_2026-08-20.md`.
