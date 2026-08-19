# ADR-0066 — Recurring automatic resume runner

- **Status:** Accepted
- **Date:** 2026-08-19

## Context

ADR-0026 established recurring-service lifecycle semantics, including pause/resume/cancel and independent generated Work Orders. The approved product rules also require an optional automatic resume date. After PR #150, HestivaOS exposed already-created future visits for review but still had no persisted automatic-resume date or execution boundary.

The current production API is a persistent NestJS process on Railway. The repository has no separate scheduler/cron service and no scheduler dependency. Automatic resume must not be implemented as a side effect of reads, because an agreement could remain paused indefinitely when nobody opens the relevant screen. It must also remain safe if Railway runs more than one API process.

## Decision

HestivaOS stores an optional `RecurringServiceAgreement.autoResumeDate` as a PostgreSQL `DATE` interpreted using the Africa/Johannesburg business calendar.

The existing Railway API process hosts a small `RecurringServiceAutoResumeRunner`. It executes once during application bootstrap and every minute thereafter. Each pass reads a bounded set of PAUSED agreements whose automatic-resume date is due and asks the recurring-service domain service to reconcile them.

The database is the concurrency authority. Each transition uses a conditional update that requires the row to remain PAUSED and due. Multiple processes may observe the same agreement, but only one conditional update may transition it. There is no distributed in-memory lock and no new scheduler provider.

A successful automatic resume clears the stored resume date and recalculates `nextServiceDate` from the current Johannesburg business date, preserving the existing no-backlog rule. If the agreement end date has already passed, reconciliation moves it to ENDED instead. Manual resume, cancel and end also clear the automatic-resume date.

Automatic resume changes only agreement lifecycle state. It does not generate, mutate or delete Work Orders and does not trigger correspondence, messaging, pricing, staffing or Finance behavior.

## Consequences

- No new environment variable, credential, external scheduler, queue or dependency is required.
- Process restart is a recovery opportunity because the runner reconciles immediately at bootstrap.
- A failed pass is retried on the next minute; the persisted date remains the durable intent.
- Horizontal API scaling is safe for the transition because the database conditional update prevents duplicate successful resumes.
- The minute interval is an execution cadence, not customer-visible appointment precision; the persisted authority is the Johannesburg calendar date.
- Operational logs contain only event names and aggregate resumed/ended counts or a failure message, not Customer or Property content.

## Rejected alternatives

- **Read-triggered resume:** rejected because lifecycle correctness would depend on someone opening a page or calling a GET endpoint.
- **In-memory-only timer state:** rejected because restart would lose the intended resume date.
- **New external cron/scheduler provider:** rejected for this bounded workflow because the existing persistent API plus durable database predicate provides the required execution and recovery semantics without another control plane.

## Related records

- ADR-0026 — Recurring service agreements
- `docs/RECURRING_LIFECYCLE_REVIEW_V1.md`
- `docs/ROADMAP.md`
