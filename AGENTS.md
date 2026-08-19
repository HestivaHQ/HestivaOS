# Repository engineering standards

These instructions apply to every file in this repository and are mandatory for all future Codex/development work. Documentation remains part of Definition of Done: implementation and current canonical documentation must not knowingly diverge.

The detailed documentation authority, impact-declaration, bounded-context and reconciliation model is in `docs/DOCUMENTATION_AUTHORITY.md`. ADR-0067 remains authoritative for the three-stage validation workflow; ADR-0069 governs documentation scalability and supersedes the old rule that every implementation must append both Changelog and Technical Work Log.

## Durable-source principles

- Record only repository state verified from code, configuration, tests or authoritative project records. Never fabricate implementation details, operational state, credentials, URLs, commands or decisions.
- The repository is the durable source of truth. Chat history and handovers are navigation aids only.
- Preserve history. Do not rewrite or delete historical records to make the past resemble the present.
- ADRs are historical. Supersede accepted decisions with a new ADR instead of rewriting them unless a maintainer explicitly directs otherwise; update the ADR index.
- Prefer one authoritative current-state document over duplicate/competing prose.
- Never store secrets or credentials. Document variable names and safe acquisition/rotation procedures only.
- Documentation must distinguish verified current state, planned work and historical state.

## Decision-documentation checkpoint

Do not allow substantive product, business, operational, financial, customer-policy, cross-system, security or architecture decisions to exist only in chat.

- Routine synchronization may batch up to approximately 15 substantive approved decisions where coordination cost is material, but this is a maximum, not permission to leave another lane dependent on undocumented state.
- Synchronize sooner for major architecture, payment/legal/customer terms, booking, security, deployment/infrastructure or cross-system decisions, or whenever continuing without durable documentation would be unsafe.
- Minor clarifications that do not create/change policy do not individually trigger a checkpoint.
- For decisions affecting another repository/provider/system, update the appropriate permanent authority and applicable coordination issue before incompatible implementation proceeds. `docs/CROSS_SYSTEM_COORDINATION.md` routes active cross-system work.

## Branch and pull-request rule

Do not write implementation or documentation changes directly to `main` by default.

- Use one focused branch/PR per work lane.
- Make scoped changes, run proportional validation, reconcile documentation/coordination, review the complete diff, then open/update a PR targeting `main`.
- Direct `main` writes require explicit maintainer authorization for that specific change.
- If a tool unexpectedly writes to `main`, report and reconcile the deviation; never conceal it.

## Parallel development and global identifiers

Treat every development chat, Codex task, branch and PR as an independent lane. Active PRs are proposed future state; `main` is canonical integrated state.

Before starting or resuming a slice:

- inspect current `main` and relevant active PRs for overlapping scope/files;
- check schema/Prisma areas, migrations, ADR numbers/index, shared API/domain contracts, enums/events, auth/authorization, current architecture/domain docs and Roadmap;
- before allocating repository-global identifiers, check both `main` and relevant active PRs (ADR numbers, migration names/timestamps, important enums/events, public API routes and other uniqueness-sensitive identifiers).

A shared filename is not automatically a conflict. Preserve and reconcile all valid changes. Never resolve shared schema, migration history, ADR index, current-state contracts or historical records by wholesale `ours`/`theirs` selection unless a maintainer explicitly confirms one side is obsolete.

Database migrations are append-only lane-owned artifacts. Do not edit/rename/delete another lane's migration to avoid a conflict. After another migration merges, synchronize with current `main` and validate the remaining sequence on top.

Merge active PRs into `main` one at a time. Immediately before merge perform relevant collision analysis. If another PR merges while a lane remains open, synchronize that lane with new `main`, deliberately reconcile shared changes, review the resulting complete diff and rerun required final validation. A previous green run does not authorize merge against a materially changed integration base.

## GitHub connector operating procedure

Default sequence: **READ → VERIFY → WRITE → VERIFY → PR**.

Before a write:

- resolve exact repository/branch/path/scope;
- fetch the exact target file from the exact branch and use its current blob SHA;
- never reconstruct an existing file from chat memory, stale local state or another branch when current GitHub content can be fetched;
- compare/verify an existing branch against current `main` before continuing it;
- prefer the existing focused branch when a fix belongs to the same PR.

During writes:

- serialize dependent writes;
- treat returned content SHA as authoritative for the next update to the same path;
- do not run parallel writes to the same path;
- do not bypass branch/PR rules because a connector action is inconvenient.

After important writes:

- read back or otherwise verify exact branch/file state;
- before PR creation, compare with `main`, inspect complete changed-file set and check unintended/stale/duplicate sources;
- after PR creation verify base, head, exact head SHA, changed files and required quality-gate run.

On connector/API failure:

1. do not blindly repeat the identical mutation;
2. re-read GitHub state first;
3. diagnose branch/path/SHA/PR state or evidenced cause;
4. retry only after state is known and request is corrected;
5. do not switch immediately to low-level Git object/ref APIs merely to bypass a blocked normal action;
6. if the connector continues to block a legitimate operation, preserve safe state and request the smallest manual action needed.

## Three-stage development validation workflow

ADR-0067 remains unchanged in principle. This model optimizes sequencing only; it does not authorize skipping documentation, security checks, migration replay, complete-diff review, exact-head verification, cross-system coordination, parallel-PR reconciliation or final CI.

### Stage 1 — Fast development loop

During active implementation/corrections, run validation proportional to the affected area.

Examples:

- API-only: focused API tests → API typecheck → API build when warranted → diff/secret checks.
- Web-only: relevant web tests → web typecheck → targeted build when warranted → diff/secret checks.
- Prisma/schema: Prisma validate/generate → affected API tests/typecheck → disposable DB check when useful; authoritative clean/staged replay remains Stage 2 CI.
- Documentation-only: documentation/history/diff verification; do not run unrelated application builds merely because Markdown changed.

Shared contracts spanning API/web require proportional checks in every affected workspace. Material architecture/security/business/operational/cross-system decisions still synchronize immediately when another lane could depend on them.

Do not repeatedly run the full repository suite while the branch is fluid unless a specific risk/evidence requires it.

### Stage 2 — Authoritative full PR CI

1. Finish scoped implementation and resolve known findings.
2. Complete the PR `Documentation impact` declaration and reconcile every affected canonical authority according to `docs/DOCUMENTATION_AUTHORITY.md`.
3. Synchronize with current `main` where required and reconcile active-PR/global-identifier/shared-contract collisions.
4. Review the complete changed-file set/diff, including current-state consistency, historical integrity where historical files are touched, stale statements and duplicate sources.
5. Freeze the exact head SHA; stop discretionary edits.
6. Run the authoritative PR workflow. Policy/security/diff, API, web/Cloudflare and PostgreSQL migration jobs remain required; there is no changed-path final-gate skipping.
7. Do not duplicate final-stage validation locally simply to reproduce checks already authoritatively running in GitHub unless diagnosis requires it.

A frozen head means no speculative refactor, wording polish, unrelated cleanup or “while CI runs” improvement. A green result authorizes only that tested head against a materially unchanged base.

### Stage 3 — Strict pre-merge review

Immediately before merge:

- verify exact reviewed/tested head SHA and required green checks;
- confirm no required gate is stale/red/running/cancelled/superseded;
- verify mergeability and synchronize with current `main` if the base materially changed;
- perform relevant parallel-PR collision analysis for overlapping files, schema/models, migrations, ADR/global identifiers, shared contracts and contradictory documentation;
- preserve valid historical/shared entries where such files are touched;
- review complete-diff integrity and canonical documentation consistency;
- merge only after repository and maintainer approval requirements are satisfied.

### Evidence-driven failure path

A failed CI gate, review/security finding, materially changed merge base or maintainer correction reopens the same scoped branch. Inspect evidence, make the smallest justified correction, run proportional checks, update documentation only where documented state changes, re-audit affected area plus complete diff, freeze the new head and rerun all required Stage 2 gates. Do not bundle unrelated improvements.

## Bounded new-chat / resumed-work reading rule

Before substantial work in a new/resumed chat:

1. read `AGENTS.md`;
2. read `docs/README.md` as the router;
3. read the relevant domain current-state document(s) for the task;
4. read only the active ADRs that materially govern that task;
5. when cross-system/provider work is involved, read `docs/CROSS_SYSTEM_COORDINATION.md` and the applicable active issue;
6. inspect current merged implementation/tests and relevant active PRs.

Historical `docs/CHANGELOG.md`, `docs/TECHNICAL_WORK_LOG.md`, superseded ADRs, old PRs and old backlog text are lookup/reference material, not mandatory startup reading unless the task requires historical analysis.

Current cross-system routes include Website ↔ HestivaOS Issue #73 and WhatsApp/Messenger ↔ HestivaOS Issue #116.

## Documentation impact and conditional update model

Every meaningful implementation/tooling PR must use the repository PR template and answer all `Documentation impact` fields truthfully. `scripts/validate_documentation.py` mechanically rejects high-confidence path/declaration contradictions and verifies mechanically determinable companions. Passing automation is only a minimum gate; Stage 2 semantic review remains authoritative.

Update a canonical document only when its authority is affected:

| Impact | Canonical authority to inspect/update when affected |
| --- | --- |
| Architecture/component/domain authority boundary | `docs/ARCHITECTURE.md`, affected domain current-state doc, `docs/WHY.md` only if rationale changed, ADR when a durable decision changed |
| Domain/business behavior | affected domain current-state document; `docs/ROADMAP.md` only when planned/completed state changed; ADR only for durable decision |
| Security/privacy/auth | affected security/auth/domain document, `docs/ARCHITECTURE.md` for authority/boundary change, `docs/ENVIRONMENT.md` only for configuration, `docs/RECOVERY_GUIDE.md` only for recovery change, ADR for durable decision |
| Database/schema/migration | affected domain current-state document; Architecture only for architectural/domain-boundary change; Deployment/Recovery only if procedure changed; ADR only for durable decision |
| Deployment/runtime configuration | `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT.md`/`docs/RECOVERY_GUIDE.md` as actually affected, Architecture/ADR only for durable topology/authority change |
| Recovery/incident procedure | `docs/RECOVERY_GUIDE.md` and other operational docs actually affected |
| Roadmap/planned state | `docs/ROADMAP.md` and/or current backlog checkpoint |
| Cross-system contract | affected permanent domain/contract doc plus applicable coordination issue; `docs/CROSS_SYSTEM_COORDINATION.md` only when routing/process changes |
| Repository/CI/documentation workflow | `docs/README.md`, `docs/DOCUMENTATION_AUTHORITY.md` when documentation policy changes, ADR for durable decision; Deployment/Recovery only if their procedures actually change |

`docs/CHANGELOG.md` is milestone-only after ADR-0069. It is required when the PR declares `OPERATOR`, `SECURITY`, `PLATFORM` or `CROSS_SYSTEM` significance. `INTERNAL`/`NONE` normally remain in PR/commit history.

`docs/TECHNICAL_WORK_LOG.md` is preserved historical material and is no longer a routine per-implementation requirement. Do not append to it merely to satisfy process. Use focused durable incident/migration/recovery documentation when unusual engineering history genuinely warrants it.

Known incorrect canonical documentation must still be corrected immediately in the responsible PR; periodic reconciliation is not an excuse to defer known errors.

## Periodic reconciliation and pilot

Follow `docs/DOCUMENTATION_AUTHORITY.md` for periodic repository reconciliation. The default trigger is approximately 10 merged implementation PRs, roadmap-phase completion or monthly during active development, whichever meaningful checkpoint comes first, plus major architecture/provider migrations.

The first 3–5 normal implementation PRs after ADR-0069 are a measured pilot. Use the PR template pilot metrics and perform a reconciliation review after the pilot before changing the policy further.

## Implementation and PR checklist

Before declaring a PR complete:

1. Verify current `main`, relevant active PRs and uniqueness-sensitive identifiers.
2. Complete the Documentation Impact Declaration and update only the affected canonical authorities.
3. Preserve material decisions in ADR/current-state/coordination sources immediately where required.
4. Complete Stage 2 current-main/parallel-lane/complete-diff review, `git diff --check` and secret scan.
5. Freeze the exact head and require all authoritative PR quality gates to pass.
6. Perform Stage 3 strict pre-merge review and merge only the reviewed/tested exact head after maintainer approval.

Every implementation PR body must include:

- Summary;
- Documentation impact declaration;
- Verification performed;
- Files changed;
- Context/coordination source where applicable;
- final integrity statement;
- pilot metrics for the first 3–5 normal implementation PRs after ADR-0069.

Documentation-only typo/formatting, comment-only code and license-only changes do not require an implementation impact declaration when the validator determines there is no meaningful implementation/tooling change. They must not be used to conceal implementation changes.