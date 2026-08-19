# ADR-0068: Persist administrative access changes as append-only identity snapshots

- Status: Accepted
- Date: 2026-08-19

## Context

HestivaOS already serializes ADMIN role and OS-access mutations, prevents self-lockout, and prevents removal of the last active administrator. Before this decision, successful changes were visible only in runtime application logs. That is insufficient as the durable operational record for privileged access changes.

The audit record must remain trustworthy even if a User's name/email later changes or an account is eventually removed under a separately approved lifecycle. The audit feature must not introduce Supabase Admin API authority, provider session revocation, invitation behavior, or a second access-control source of truth.

## Decision

Persist each effective ADMIN role/status change as one append-only `UserAccessChange` record in the same PostgreSQL `SERIALIZABLE` transaction as the authoritative User mutation.

Each audit record stores:

- target application User UUID;
- target email and display-name snapshot at mutation time;
- actor application User UUID;
- actor email and display-name snapshot at mutation time;
- old and new application role;
- old and new application access status; and
- server-created timestamp.

The audit record intentionally stores historical User identifiers and identity snapshots as values rather than live Prisma relations. This preserves the historical statement independently of later profile edits and avoids making future User-record lifecycle depend on deleting or rewriting privileged-access history. The authenticated ADMIN mutation boundary is responsible for resolving the actor and target from canonical HestivaOS Users before the event can be inserted.

No audit row is created when a mutation is a no-op. Audit insertion and access mutation are atomic: either both commit or neither commits.

`GET /api/v1/users/:id/access-history` is ADMIN-only and returns at most the latest 100 records, newest first. The current User role/status remains authoritative; audit history is evidence, not state.

## Consequences

- Privileged application access changes gain durable provenance beyond ephemeral logs.
- Historical labels do not change when current User profiles change.
- The access-management transaction remains the single authority for role/status changes.
- Supabase invitation, Auth-provider role/session changes and provider-session revocation remain separate work and must not be inferred from this audit feature.
- If future requirements need full historical export beyond the latest 100 API records, add deliberate pagination/export rather than making the operational read unbounded.

## Rejected alternatives

### Runtime logs only

Rejected because deployment/runtime logs are not the durable application-owned audit record.

### Derive history from the current User row

Rejected because a current-state row cannot reconstruct actor, timing or prior values.

### Store only live User relations

Rejected because later identity/profile lifecycle could reinterpret or constrain historical evidence. Snapshot values preserve what was known when the access decision occurred.

### Add Supabase Admin actions in the same slice

Rejected because provider invitations/session revocation require separate credentials, recovery behavior and authority review. This slice remains provider-neutral.

## Review triggers

Review this decision if HestivaOS introduces a general security-audit/event domain, immutable external audit storage, formal retention/export requirements, or a User deletion lifecycle that requires stronger legal/compliance retention semantics.
