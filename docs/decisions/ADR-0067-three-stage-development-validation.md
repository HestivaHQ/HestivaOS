# ADR-0067: Three-stage development validation

- **Status:** Accepted
- **Date:** 2026-08-19
- **Decision owner:** HestivaOS maintainer

## Context

HestivaOS requires strict documentation integrity, exact-head validation, migration replay, security scanning, cross-system coordination and parallel-PR reconciliation. Recent implementation work showed that repeatedly performing broad repository validation and completion-document reconciliation while a branch was still changing created avoidable head churn and repeated GitHub Actions runs. Measured final PR CI was materially shorter than the total implementation cycle, so the dominant delay was repetition rather than an inherently slow final gate.

The repository must remain the durable source of truth. This optimization therefore cannot defer material architecture, security, product, operational or cross-system decisions into chat history, and it cannot remove any meaningful final merge safeguard.

## Decision

Adopt a three-stage validation model.

### 1. Fast development loop

During active implementation and evidence-driven corrections, run validation proportional to the affected area. Examples include focused tests, the affected workspace typecheck, Prisma validation/generation for schema work, a targeted build when compilation or packaging risk warrants it, secret scanning at meaningful checkpoints, and `git diff --check`.

Material durable decisions are still synchronized immediately when another lane or future resumed chat could depend on them. Completion-oriented history and final current-state reconciliation may be batched until the implementation stabilizes, but must be complete before final CI.

### 2. Authoritative full PR CI

Once implementation, required documentation, coordination and complete-diff review are complete, freeze the exact head and use GitHub Actions as the authoritative comprehensive integration gate. The PR workflow runs independent policy/security/diff, API, web/Cloudflare and PostgreSQL migration jobs in parallel. All remain required; the optimization does not introduce path-based final-gate skipping.

The CI graph removes redundant compilation where the same build was already covered by a more authoritative downstream check. In particular, the root build and repeated independent API/web builds are not run in addition to the dedicated jobs, and OpenNext remains the authoritative web production/Cloudflare build before Wrangler dry-run.

### 3. Strict pre-merge review

Immediately before merge, verify the exact reviewed/tested head SHA, required green checks, mergeability, current-main synchronization where required, relevant parallel-PR collisions, shared append-only history reconciliation, complete diff integrity and canonical documentation consistency. Never merge stale, red, running or superseded validation.

## Failure handling

A failed CI gate, review/security finding, materially changed merge base or maintainer correction is new evidence. Reopen the same scoped branch only for the smallest justified correction, run proportional affected-area checks, update documentation only where the correction changes documented state, re-audit diff integrity, freeze the new head and rerun the complete required final CI.

## Context-drift safeguards

- `main` remains the canonical integrated implementation state.
- New/resumed chats still read `AGENTS.md`, relevant current-state documents/ADRs and applicable coordination issues before substantive work.
- Active PRs remain proposed future states and must be checked for overlap before new work/global identifiers are allocated.
- Material architecture, security, business, operational and cross-system decisions cannot remain only in chat while implementation continues.
- ADRs, architecture documents, Roadmap, coordination issues and other durable sources retain their existing authority.
- Changelog and Technical Work Log remain mandatory for every meaningful implementation change, with automation enforcing their presence as a minimum documentation gate.

## Consequences

- Development feedback becomes faster because unrelated full-suite checks are not repeatedly run while code is still fluid.
- Final merge confidence is preserved because every meaningful final gate still executes against the frozen PR head.
- CI wall-clock time is reduced by parallelizing independent jobs and removing duplicate builds.
- GitHub compute may increase somewhat because independent jobs each perform their own locked install; wall-clock latency is preferred over unsafe artifact coupling at this stage.
- Fewer repeated edits to shared historical documents reduce opportunities for accidental history drift and parallel-PR conflicts.

## Supersession

This ADR supersedes the narrower frozen-head-only workflow wording introduced earlier on PR #151. The frozen-head concept is retained as the boundary between Stage 2 reconciliation and authoritative final CI, but it is now part of the broader three-stage model rather than the whole development workflow.
