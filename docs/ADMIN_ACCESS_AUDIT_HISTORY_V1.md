# Admin access audit history v1

## Current-state contract

HestivaOS application access remains owned by the canonical `User.role` and `User.status` fields. ADMIN-only role changes and OS-access enable/disable actions continue to use the existing serialized access-management transaction, including self-lockout prevention and last-active-ADMIN protection.

This slice adds durable evidence for effective access changes without changing that authority.

## Durable record

`UserAccessChange` is append-only audit history for effective ADMIN role/status mutations. Each row records:

- target HestivaOS User UUID;
- target email and display-name snapshot;
- acting HestivaOS User UUID;
- actor email and display-name snapshot;
- old/new `UserRole`;
- old/new `UserStatus`; and
- server-created timestamp.

The identity values are snapshots rather than live relational presentation. Later profile edits must not rewrite what the audit event recorded at mutation time. The UUID values remain historical application identifiers.

The row is inserted inside the same PostgreSQL `SERIALIZABLE` transaction as the User mutation. If the User update or audit insert fails, neither change commits. A request that results in no effective role/status change produces no audit row.

## Read boundary

`GET /api/v1/users/:id/access-history` is ADMIN-only. It first requires the target User to exist, then returns at most the latest 100 audit rows in reverse chronological order. This bounded operational read is not an export API.

Audit history is evidence only. It does not restore, override or calculate current permissions; current `User.role` and `User.status` remain authoritative.

## Security and scope boundaries

This slice does not:

- expose the history to non-ADMIN roles;
- change authentication-token verification;
- change Supabase Auth identities;
- invite Supabase users;
- revoke provider sessions;
- introduce service-role/admin credentials;
- automatically restore a prior role/status from history; or
- create a general-purpose security-event bus.

Supabase Admin invitation and provider-session revocation remain the next separately reviewed provider-admin slice.

## Recovery / verification

After migration/deployment, verify that:

1. the `user_access_changes` table exists and migration history is clean;
2. a permitted ADMIN role/status change commits both the User state and one audit row;
3. a blocked self-demotion/last-admin mutation commits neither a User change nor audit row;
4. a no-op mutation creates no row; and
5. the ADMIN history endpoint returns the latest records newest-first and rejects unauthorized callers through the existing role guard.

See ADR-0068 for the durable design decision.
