# ADR-0092: Isolate launch-baseline reset behind a pre-launch destructive boundary

Status: Accepted

Date: 2026-09-02

## Context

Launch-readiness acceptance requires HestivaOS to exercise real operational mutation paths before launch and then return to a verifiably clean first-day-of-business state. The existing ADMIN Customer Data Cleanup boundary is intentionally Customer-scoped and is not sufficient to remove workforce fixtures, Quotes, Work Orders, recurring/planning state, messaging/correspondence runtime evidence, public enquiries, counters, or private operational Storage residue.

A generic database truncation is also unsafe. HestivaOS stores canonical configuration and protected history in the same database as disposable pre-launch operational state, later features introduce operational tables through raw SQL outside the Prisma model list, and operational records can own exact private Supabase Storage paths. A reset that silently misses a new table or deletes database metadata before reconciling Storage could falsely claim a clean launch baseline.

The reset is a uniquely destructive pre-launch operation. Leaving it permanently executable in production merely because a caller is an ADMIN would create an unacceptable catastrophic-data-loss path.

## Decision

HestivaOS will provide a separate `Reset OS to Launch Baseline` boundary with all of the following controls:

1. API authorization remains ADMIN-only through the canonical application role guard.
2. Execution is disabled by default and additionally requires the API-only runtime variable `HESTIVA_LAUNCH_BASELINE_RESET_ENABLED=true`. The switch is enabled only for an approved pre-launch acceptance/reset window and removed immediately afterwards.
3. The reset uses explicit reviewed **preserve** and **dispose** table classifications. It does not use caller-selected table names or generic `TRUNCATE ... CASCADE`.
4. Any public database table that is absent from both classifications blocks execution. New persistence therefore requires an explicit launch-reset ownership decision before a future reset can claim the OS is clean.
5. The operator must first obtain a read-only impact preview. Execution requires both the exact destructive confirmation phrase and the exact SHA-256 fingerprint of the current preview, so intervening database/Storage state invalidates stale approval.
6. Canonical configuration, Prisma migration history, application Users and immutable User access-change history are preserved. Supabase Auth identities and profile-photo Storage remain outside this local operational reset authority.
7. Exact known private operational Storage paths are removed before their database metadata. The browser never receives the Supabase service-role credential and cannot submit arbitrary buckets or paths.
8. Where Storage ownership is not proven, the reset fails closed. In V1 this includes persisted Quote-photo Storage paths; their existence blocks execution rather than guessing a bucket.
9. After Storage cleanup and the database transaction, the API recomputes the full impact and reports success only when all classified disposable rows and known operational Storage obligations are zero and no blocker remains.
10. The reset does not claim to reverse external provider actions such as already-sent email, WhatsApp, or Messenger traffic. Acceptance testing must use controlled recipients/provider-safe boundaries.

## Consequences

The launch reset is deliberately more conservative than a convenience cleanup. A newly introduced table can stop a future reset until its ownership is reviewed, and unresolved Storage metadata can block launch-baseline restoration. That friction is intentional because a false clean-baseline claim is more dangerous than a reset that refuses to proceed.

Storage deletion precedes database deletion so exact persisted object paths remain available for retry/reconciliation. If Storage succeeds and the later database transaction fails, the remaining database rows are still disposable pre-launch state; live operations must not begin, and the reset must be retried/reconciled rather than treating the partial attempt as success.

The runtime switch is not a user-facing permission and is never exposed to Cloudflare. Railway/API deployment configuration owns it. Normal production state is absent/false.

Customer Data Cleanup remains a separate narrow ADMIN operation and is not replaced or broadened by this decision.

## Alternatives rejected

- **Reuse Customer Data Cleanup:** rejected because its aggregate boundary is intentionally narrower and does not prove a system-wide launch baseline.
- **`TRUNCATE ... CASCADE` all operational-looking tables:** rejected because cascade behavior can cross into protected configuration/history and does not establish Storage correctness.
- **Delete all Supabase Auth identities:** rejected because external identity-provider state is not safely or reversibly owned by this local database reset.
- **Leave the reset permanently ADMIN-executable:** rejected because role authorization alone is insufficient protection for a whole-system destructive operation after launch.
- **Guess Storage buckets from path names:** rejected because an incorrect guess can strand or destroy unrelated objects.

## Review triggers

Review or supersede this ADR if:

- HestivaOS introduces a disposable isolated acceptance environment that removes the need for production/pre-launch reset execution;
- operational persistence moves outside the current PostgreSQL/Supabase Storage boundaries;
- Quote-photo Storage ownership becomes canonical and can be safely added to the reset contract;
- application identity/configuration ownership changes such that preserved tables must change;
- launch-reset execution becomes unnecessary after the first production launch and the endpoint can be removed entirely.
