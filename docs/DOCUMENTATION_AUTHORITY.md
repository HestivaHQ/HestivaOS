# Documentation authority and bounded context model

## Purpose

This document defines how HestivaOS documentation scales without turning routine feature work into repository-wide history maintenance. The repository remains the durable source of truth. This model narrows documentation responsibilities so current truth stays compact, detailed implementation history stays in GitHub, and new/resumed work loads only the context required for the affected domain.

ADR-0069 records the decision. ADR-0067 remains authoritative for the three-stage validation workflow and all final safety gates.

## Authority hierarchy

When sources disagree, use this order:

1. Current merged code, schema, configuration and executable tests for verified implementation behavior.
2. Current-state domain documentation, `ARCHITECTURE.md`, operational documents and active ADRs for durable current contracts and decisions.
3. Active coordination issues for approved cross-system intent, blockers and not-yet-merged shared changes.
4. Active pull requests as proposed future state only.
5. Historical records, superseded ADRs, old roadmap text and old PRs as lookup material.
6. Chat history only as a navigation aid.

## Narrow responsibilities

### `AGENTS.md`
Repository engineering procedure, validation, branch/PR safety, context-loading rules and documentation-impact requirements. Keep it concise; detailed documentation policy lives here.

### `docs/README.md`
Documentation router. It should help an agent find the current-state domain packet, active ADRs, coordination route and implementation area without reading unrelated history.

### `docs/ARCHITECTURE.md`
Compact current cross-domain technical truth. Update only when component/domain ownership, authority boundaries, major data flow, runtime topology or cross-domain architecture changes. Do not use it as a chronological implementation log.

### Domain current-state documents
Authoritative current behavior and contract for one meaningful domain. Update when that domain contract changes. Prefer one maintained authority over repeated prose in Architecture, Changelog and Work Log.

### ADRs
Durable architectural, business, security, infrastructure or operational decisions and rationale. Create only when a genuine durable decision is introduced or superseded. Accepted ADRs remain historical; supersede rather than rewrite.

### `docs/WHY.md`
Durable engineering/product rationale. Update only when rationale changes.

### `docs/ROADMAP.md` and canonical backlog checkpoints
Verified future work and sequencing. Update when planned/completed state materially changes. They are not implementation journals.

### `docs/DEPLOYMENT.md`
Current deployment procedure, controller ownership and deployment configuration contract. Update only when deployment behavior changes.

### `docs/RECOVERY_GUIDE.md`
Current recovery and incident procedure. Update only when recovery behavior changes.

### `docs/ENVIRONMENT.md`
Current environment-variable names, scopes and safe acquisition/recovery procedure. Never store values.

### `docs/CROSS_SYSTEM_COORDINATION.md` and coordination issues
Cross-repository/provider routing and active shared-contract synchronization. Material shared changes must still be recorded immediately when another lane depends on them.

### Tests
Executable behavioral evidence. Tests do not replace policy/rationale documents, but they are preferred evidence for precise behavior that can be executed.

### Pull requests and commits
Detailed implementation history: what changed, how it was implemented, verification, migration details and exact diffs. Canonical documentation should not duplicate this detail unless it is needed to explain current behavior, operations or a durable decision.

### `docs/CHANGELOG.md`
Curated milestone history. It is no longer mandatory for every meaningful implementation. Add entries for operator/customer-significant capability, security/authority changes, platform/deployment milestones, major schema/domain milestones, cross-system contract milestones or other changes that materially help future maintainers understand product/platform evolution.

Routine internal refactors, focused bug fixes, implementation-only cleanup and small UI/search changes normally remain in the PR/commit history unless they meet the significance threshold.

### `docs/TECHNICAL_WORK_LOG.md`
Frozen historical engineering record through the Phase 2 documentation scalability transition. Preserve all existing history. It is no longer a routine per-implementation requirement after ADR-0069. New detailed implementation history belongs in PRs/commits/tests. Create a focused durable incident/migration/recovery document when an unusual event genuinely needs permanent technical history.

## Documentation impact declaration

Every implementation/tooling PR must include a `Documentation impact` section using the repository PR template. Each field must be answered `YES` or `NO`; the Changelog field uses the defined significance values.

Required fields:

- Architecture/component boundary
- Domain/business behavior
- Security/privacy/auth
- Database/schema/migration
- Deployment/runtime configuration
- Recovery/incident procedure
- Roadmap/planned state
- Cross-system contract
- Durable decision
- Repository/CI workflow
- Changelog significance
- Documentation companions
- Coordination source

A `YES` is a claim that the named authority was materially affected. `Documentation companions` must list the actual current-state/operational/ADR files changed because of those impacts, or `NONE` when no canonical companion is required.

The declaration is not self-certifying. CI mechanically infers high-confidence impacts from changed paths and rejects contradictory `NO` answers. CI also verifies mechanically determinable companion requirements. Stage 2 semantic review remains responsible for impacts that cannot be inferred safely from paths alone.

## Bounded context packet

New/resumed development work should load context in this order:

1. `AGENTS.md`.
2. `docs/README.md` as the documentation/domain router.
3. The relevant domain current-state document(s) for the task.
4. Only the active/non-superseded ADRs that materially govern that domain/task.
5. `docs/CROSS_SYSTEM_COORDINATION.md` and the applicable coordination issue only for cross-system/provider work.
6. Current merged implementation and relevant tests.
7. Relevant active PRs for proposed future state and collision analysis.

Historical `CHANGELOG.md`, `TECHNICAL_WORK_LOG.md`, superseded ADRs, old PRs and old roadmap checkpoints are lookup/reference material and are not mandatory startup reading unless the task specifically requires historical analysis, migration archaeology, incident reconstruction or supersession review.

## Domain routing model

`docs/README.md` should maintain a compact domain routing table. Each row should identify:

- domain;
- current-state document(s);
- primary implementation area;
- active ADR(s) or ADR range where useful;
- coordination issue when applicable.

The router is a discovery index, not a duplicate of domain content. As HestivaOS grows, new domains should be added to the router rather than increasing the mandatory startup reading set.

## Periodic repository reconciliation

Global hygiene should be deliberate rather than charged to every feature PR.

Run a repository reconciliation checkpoint after approximately 10 merged implementation PRs, at completion of a roadmap phase, or monthly when active development continues—whichever meaningful checkpoint comes first. Also run one after a major architecture/provider migration.

Checkpoint activities may include:

- current-state documentation consistency;
- stale/superseded wording audit;
- domain-router accuracy;
- ADR/index/supersession audit;
- roadmap/backlog reconciliation;
- duplicated-document detection and safe archival proposals;
- dependency/security diagnostic review;
- deployment/recovery verification;
- cross-system coordination reconciliation.

Periodic reconciliation never authorizes knowingly incorrect canonical documentation to remain unfixed. Known incorrect current-state/security/operational documentation is corrected in the responsible PR as soon as it is discovered.

## Parallel development

Reducing routine writes to global historical files does not weaken parallel-lane safety. Current-main checks, active-PR inspection, schema/migration coordination, ADR/global identifier reservation, shared-contract review and exact-head merge checks remain mandatory.

Because Changelog and Technical Work Log are no longer unconditional shared-file dependencies, independent lanes should collide less often mechanically. Where two lanes genuinely change the same current-state authority, both valid changes must still be reconciled deliberately.

## Pilot and measurement

Use the next 3–5 normal implementation PRs after this transition as a measured pilot.

For each pilot PR record in the PR body or final review note:

- number of documentation files changed;
- whether Changelog was required and why;
- whether Technical Work Log was touched (normally no);
- number of documentation-only correction commits after implementation stabilized;
- implementation-to-freeze elapsed time where observable;
- final CI wall-clock time;
- any missed or disputed documentation-impact classification.

After 3–5 PRs, perform a reconciliation checkpoint and evaluate whether the model reduced documentation churn without producing a material documentation miss. Tighten inference or routing rules if evidence shows a weakness.

## Non-negotiable safeguards

This policy does not remove or weaken:

- repository authority over chat memory;
- immediate recording of material decisions another lane depends on;
- ADR history and supersession rules;
- current-main and active-PR checks;
- schema/migration/global-identifier coordination;
- cross-system coordination;
- secret scanning;
- meaningful tests and production builds;
- clean and staged PostgreSQL replay;
- complete-diff review;
- exact-head verification;
- required green final CI;
- the prohibition on merging stale, red, running or superseded validation.

The optimization removes duplication and unnecessary frequency, not evidence.