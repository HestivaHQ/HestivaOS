# ADR-0014: Enforce application access at the API boundary

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

Supabase Auth proves an identity, while the Hestiva application `User` owns the product role and `ACTIVE`/`INACTIVE` access state. Disabling only a navigation control would leave valid Supabase sessions able to call application APIs. Concurrent changes could also remove every active administrator if last-admin checks occurred outside the mutation boundary.

## Decision

All API routes except explicit liveness and readiness endpoints pass through a global guard. The guard validates the Supabase bearer token, resolves the application User, rejects `INACTIVE` users, and applies route role metadata. The synchronization endpoint is the narrow exception that permits an authenticated identity without an application User so the existing bootstrap and verified stale-identity reconciliation can run.

`User.status` represents OS access, not employment; the separate `Technician.status` remains the current workforce status. ADMIN-only role and access mutations use a serializable database transaction plus one transaction-scoped PostgreSQL advisory lock. The lock, last-active-ADMIN count, and update occur together. Self-demotion and self-disable are rejected conservatively.

## Consequences

Disabling access blocks future login bootstrap and the next API request made by an existing Supabase session. The web server signs out a disabled user when page bootstrap detects that controlled denial. Provider-wide Supabase session revocation is not performed because the repository has no server-side service-role administration architecture; a provider token may remain valid at Supabase while it cannot authorize Hestiva API access.

Role changes update only `User.role`; Supabase Auth claims and UUIDs remain untouched. Permanent deletion and account creation are deferred. Administrative changes currently produce identifier-only structured application logs; a durable product audit model is deferred because no suitable general audit model exists.
