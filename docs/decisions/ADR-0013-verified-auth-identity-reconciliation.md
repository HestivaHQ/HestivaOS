# ADR-0013: Reconcile replaced Supabase identities by verified email

- **Status:** Accepted
- **Date:** 2026-08-09

## Context

Supabase Auth identities and Hestiva application `users` are separate records joined by `users.auth_user_id`. Deleting an Auth identity does not delete its application user. Re-registering the same address creates a new Auth UUID, while the prior application user and its operational foreign-key references remain.

The previous UUID-only upsert attempted to insert a second application user. The unique `users.email` constraint rejected that insert, and the unhandled database error surfaced through the authenticated home-page bootstrap as HTTP 500.

## Decision

User synchronization first matches the authoritative Auth UUID, then searches application users using the normalized authenticated email. When exactly one stale application user matches, synchronization may update only its Auth UUID and normalized email if Supabase reports `email_confirmed_at`. The application user primary key, role, profile, and relationships are retained.

An unverified match, multiple normalized matches, an Auth-UUID/email conflict, or a concurrent uniqueness conflict fails closed with a controlled HTTP error and identifier-only server diagnostics. If neither UUID nor email matches, the existing new-user bootstrap remains in effect.

## Consequences

Replacing a confirmed Supabase identity can recover the existing application identity without deleting or duplicating operational records. Email confirmation is mandatory only when claiming a pre-existing application user. Ambiguous states require administrator investigation; the administration UI and broader account lifecycle remain deferred to Product Slice 3.

The Supabase Dashboard Site URL and allowed redirect URLs remain deployment-owned configuration. Signup derives its confirmation callback from the active Hestiva OS browser origin rather than a hard-coded deployment hostname.
