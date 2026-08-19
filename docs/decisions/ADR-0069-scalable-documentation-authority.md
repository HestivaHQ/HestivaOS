# ADR-0069: Scalable documentation authority and bounded context loading

- **Status:** Accepted
- **Date:** 2026-08-19
- **Decision owner:** HestivaOS maintainer

## Context

HestivaOS already uses the ADR-0067 three-stage development validation workflow: proportional fast-loop checks, authoritative parallel full PR CI, and strict exact-head pre-merge review. That model remains sound and is not being replaced.

As the repository has grown, a different scaling problem has become material: routine implementation PRs increasingly touch multiple global documentation files, especially `docs/CHANGELOG.md` and `docs/TECHNICAL_WORK_LOG.md`, even when the same detailed implementation history already exists in pull requests, commits, tests, migrations and focused domain documents. Large shared historical files increase connector/edit cost, accidental historical drift, merge-collision risk and new-chat context cost.

The repository must remain the durable source of truth, material decisions must not remain only in chat, and final safety gates must not be weakened. The optimization therefore targets duplication, authority clarity and documentation frequency rather than reducing evidence.

## Decision

Adopt a narrow-responsibility documentation authority model and bounded context-loading system.

### Current-state authority

- `AGENTS.md` owns repository engineering procedure and points to the detailed documentation authority model.
- `docs/README.md` is the documentation/domain router.
- `docs/ARCHITECTURE.md` is compact current cross-domain architecture, not a chronological implementation log.
- focused domain current-state documents own detailed current behavior for their domains.
- ADRs own durable architectural/business/security/operational decisions and rationale.
- `docs/WHY.md` owns durable rationale only.
- `docs/ROADMAP.md` and backlog checkpoints own verified future work and sequencing.
- Deployment, Environment and Recovery documents own current operational procedure/configuration only.
- Cross-system coordination documents/issues own routing and active shared-contract synchronization.
- tests are executable behavioral evidence.
- pull requests and commits own detailed implementation history.

### Changelog

`docs/CHANGELOG.md` becomes a curated milestone history rather than a mandatory per-implementation ledger. It is required only for operator/customer-significant capability, security/authority changes, platform/deployment milestones, major schema/domain milestones, cross-system contract milestones, or other changes whose milestone value is explicit in the PR impact declaration.

### Technical Work Log

`docs/TECHNICAL_WORK_LOG.md` is preserved intact as historical engineering record through this transition and is retired from routine per-implementation requirements. Future detailed implementation history belongs in PRs/commits/tests. Focused incident, migration, recovery or reconciliation documents may still be created where durable technical history is genuinely useful.

### Documentation impact declaration

Every implementation/tooling PR declares explicit documentation impacts. CI mechanically infers high-confidence impacts from changed paths, rejects contradictory `NO` answers, and verifies mechanically determinable companion requirements. Semantic review remains mandatory for impacts that path inference cannot safely determine.

The declaration is therefore evidence-backed and does not replace Stage 2 review.

### Bounded context loading

New/resumed work loads: `AGENTS.md` → documentation router → affected domain current-state docs → relevant active ADRs → coordination issue when applicable → current source/tests → relevant active PRs.

Historical Changelog, Technical Work Log, superseded ADRs and old PRs are lookup material rather than mandatory startup context unless historical analysis is required.

### Periodic reconciliation

Perform deliberate global reconciliation after approximately 10 merged implementation PRs, at completion of a roadmap phase, or monthly during active development, whichever meaningful checkpoint comes first, plus major architecture/provider migrations. This does not permit known incorrect canonical documentation to remain unfixed.

### Pilot

Use the next 3–5 normal implementation PRs as a measured pilot. Record documentation-file count, Changelog/Work-Log use, documentation-only correction commits, implementation-to-freeze time where observable, CI time and disputed/missed impact classifications. Reconcile and adjust inference/routing rules after the pilot.

## Preserved safeguards

This decision does not remove or weaken current-main verification, active-PR collision analysis, schema/migration/global-identifier coordination, cross-system coordination, secret scanning, tests, production builds, clean/staged PostgreSQL replay, complete-diff review, exact-head verification, or required green final CI.

ADR-0067 remains authoritative for the three-stage validation model and final CI topology.

## Supersession

This ADR supersedes the per-implementation historical-document requirement in ADR-0067 and the portions of ADR-0008 that require routine duplication into Changelog/Technical Work Log. It does not supersede ADR-0067's validation stages or ADR-0008's principles that documentation is part of Definition of Done, repository documentation must be truthful, and durable decisions must be recorded.

## Consequences

- Routine documentation cost becomes more proportional to the affected domain than total repository size.
- New/resumed context loading remains bounded as the repository grows.
- Fewer unconditional shared-file edits reduce parallel-lane conflicts and accidental history rewrites.
- Detailed implementation history becomes more dependent on durable GitHub PR/commit retention, which is already the repository source-control authority.
- CI/documentation policy becomes slightly more sophisticated and therefore requires pilot measurement and periodic review.
- Semantic review remains necessary; mechanical inference is intentionally conservative and cannot classify every business/documentation impact.