# ADR-0070: Bound Supabase administrator operations to invitation and refresh-session revocation

- **Status:** Accepted
- **Date:** 2026-08-19

## Context

HestivaOS already owns application authorization through canonical `User.role` and `User.status`. An inactive application User is rejected at the API boundary even if a previously issued Supabase JWT remains cryptographically valid. The repository now needs a bounded server-side provider-administration capability for inviting identities and reducing the lifetime of provider refresh access after an administrator disables HestivaOS access.

Supabase's administrator invitation API requires a service-role credential. Provider-wide sign-out cannot be performed for an arbitrary target identity using only that identity's UUID because the supported sign-out operation requires the target session token. Deleting the Supabase Auth identity would be unnecessarily destructive and would work against the existing verified-email identity-reconciliation design.

## Decision

The persistent Railway API may use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code for explicitly reviewed provider-administration operations. The first approved operations are:

1. ADMIN-only email invitation through Supabase Auth Admin `inviteUserByEmail`.
2. Refresh-session revocation after a successful HestivaOS access disablement by deleting the target identity's rows from Supabase `auth.sessions` through the existing privileged PostgreSQL connection.

`User.status = INACTIVE` remains the immediate and authoritative HestivaOS kill switch. Provider session deletion is deliberately sequenced after the application mutation: if provider revocation fails, HestivaOS access remains disabled and the request reports that provider revocation did not complete. Existing access JWTs may remain cryptographically valid until expiry, but they cannot authorize HestivaOS API requests because the global application guard resolves and rejects the inactive User.

Provider identity deletion is not part of access disablement. Re-enabling HestivaOS access does not recreate provider sessions; the user must authenticate normally.

Invitation creates or targets the Supabase Auth identity only. It does not pre-create a HestivaOS `User`, assign elevated application permissions, or bypass canonical synchronization. On first verified authentication, the existing `/users/sync` reconciliation path remains responsible for binding or creating the application User under its existing rules.

## Security boundaries

- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser or a `NEXT_PUBLIC_*` variable.
- Invitation remains ADMIN-only through the existing role guard.
- Session revocation is coupled only to a successful ADMIN access-disable mutation; self-disable and last-active-ADMIN protections run first.
- No endpoint exposes arbitrary SQL or arbitrary Supabase Admin methods.
- No Supabase Auth user deletion is introduced.
- Application audit history remains the durable evidence for the effective HestivaOS role/status change.

## Consequences

HestivaOS gains a small provider-administration surface without moving authorization authority into Supabase claims. Access disablement is immediate at the application boundary and additionally prevents normal refresh continuation when provider-session deletion succeeds. A provider-session deletion failure is visible to the administrator but does not roll back the safer application-disabled state.

Direct `auth.sessions` access couples this operation to the Supabase Auth schema. Review this decision if Supabase provides a supported server-side arbitrary-user session revocation API, changes Auth schema access guarantees, or the database role can no longer delete the target session rows.
