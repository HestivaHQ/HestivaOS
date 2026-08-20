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

## Provider-administration extension

The separately reviewed provider-admin slice adds two bounded Supabase operations without changing application authorization authority:

- `POST /api/v1/users/admin/invitations` is ADMIN-only and requests a Supabase Auth invitation through the server-side Admin API; it does not pre-create a HestivaOS User or assign an application role.
- after a successful HestivaOS access-disable mutation, the Railway API removes the target Supabase Auth identity's refresh-session rows from `auth.sessions` when an Auth identity is linked. This preserves the provider identity while preventing normal refresh continuation.

`User.status = INACTIVE` remains the immediate HestivaOS kill switch. Existing JWTs may remain cryptographically valid until expiry, but the global application guard rejects the inactive User on every protected request. If provider-session revocation fails, HestivaOS access stays disabled and the request reports the provider failure rather than restoring application access.

The server-side provider-admin implementation reuses the existing API-only `SUPABASE_SERVICE_ROLE_KEY`. The credential must never be exposed to browser code or a `NEXT_PUBLIC_*` variable. Provider identity deletion and arbitrary Supabase Admin operations are not introduced.

See ADR-0070 for the provider-administration decision.

## Security and scope boundaries

The access-audit and provider-admin boundaries do not:

- expose audit history or provider-administration actions to non-ADMIN roles;
- change authentication-token verification;
- move HestivaOS authorization into Supabase claims;
- delete Supabase Auth identities as part of access disablement;
- expose service-role/admin credentials to the browser;
- automatically restore a prior role/status from history; or
- create a general-purpose security-event bus.

## Recovery / verification

After migration/deployment, verify that:

1. the `user_access_changes` table exists and migration history is clean;
2. a permitted ADMIN role/status change commits both the User state and one audit row;
3. a blocked self-demotion/last-admin mutation commits neither a User change nor audit row;
4. a no-op mutation creates no row;
5. the ADMIN history endpoint returns the latest records newest-first and rejects unauthorized callers through the existing role guard;
6. an ADMIN invitation request never exposes the service-role credential and does not assign an application role by itself; and
7. disabling a linked User leaves `User.status = INACTIVE` authoritative even if provider-session deletion fails visibly.

See ADR-0068 for the durable audit design decision and ADR-0070 for the provider-administration extension.
