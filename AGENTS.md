# Repository engineering standards

These instructions apply to every file in this repository and are mandatory for all future Codex work. Documentation is part of the Definition of Done: code and documentation must never diverge, and no implementation is complete until the relevant documentation is updated and verified in the same change.

## Documentation principles

- Record only repository state verified from code, configuration, tests, or authoritative project records. Never fabricate implementation details, operational state, credentials, URLs, commands, or decisions.
- Preserve engineering history. Append dated entries to historical records; do not rewrite or delete earlier work to make the past resemble the present.
- ADRs are append-only historical records. Create a new ADR that explicitly supersedes an old decision instead of overwriting it, unless a maintainer explicitly directs otherwise. Update the ADR index when adding or superseding an ADR.
- Prefer updating the existing authoritative document over creating duplicate or competing documentation.
- Never store secrets or commit credentials. Document variable names and safe acquisition/rotation procedures, never secret values.
- Never modify runtime or deployment configuration without documenting the change, its scope, and its verification.
- Documentation statements must distinguish verified current state, planned work, and historical state.

## Decision-documentation checkpoint

Do not allow substantive product, business, operational, financial, customer-policy, cross-system, or architecture decisions to accumulate only in chat history.

- Routine documentation synchronization may batch up to approximately **15 substantive approved decisions** where each synchronization has material coordination cost. This is a batching maximum, not a requirement to manufacture decisions or delay a natural checkpoint.
- Update documentation sooner when a major architecture, payment, legal/customer-terms, booking, operational, security, deployment, infrastructure, or cross-system decision is approved, or when continuing without synchronization would make implementation unsafe or inconsistent.
- Minor clarifications that do not create or change policy do not individually trigger a checkpoint.
- Handovers and chat history are navigation aids only; the repository is the durable source of truth.
- For decisions affecting another repository, provider, or system, synchronize the permanent documentation in every affected repository and the applicable active coordination issue before incompatible implementation proceeds. Use `docs/CROSS_SYSTEM_COORDINATION.md` to route work to the correct issue.

## Branch and pull-request rule

Do not write implementation or documentation changes directly to `main` by default.

- Create or use a focused feature/documentation branch.
- Make the scoped changes on that branch.
- Run the required validation and review the complete diff.
- Open a pull request targeting `main`.
- A direct write to `main` is allowed only when the maintainer explicitly authorizes that exception for the specific change. General approval to make a change does **not** waive the branch/PR rule.
- If a tool unexpectedly writes directly to `main`, report the deviation immediately and reconcile any affected documentation instead of concealing it.

## Parallel development and multiple active PRs

Treat every active development chat, Codex task, branch, and pull request as an independent work lane. Parallel work is allowed, but no lane may assume that its branch is the repository's final future state.

- One work lane owns one focused branch/PR scope. Do not modify, reset, force-update, reuse, or repurpose a branch owned by another active lane unless the maintainer explicitly coordinates that handoff.
- `main` is the canonical integrated repository state. Active PR branches are proposed future states and must not be treated as canonical merely because their tests are green.
- Before starting a new implementation slice, inspect current `main` and all relevant active PRs for overlapping scope and changed files. Pay particular attention to Prisma/schema changes, migrations, ADRs and their index, shared API/domain contracts, enums, authentication/authorization, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, and `docs/TECHNICAL_WORK_LOG.md`.
- Before allocating a repository-global identifier, check both `main` and relevant active PRs. This includes ADR numbers, migration names/timestamps, important enum/event names, public API routes, and other identifiers whose uniqueness matters across lanes. Do not knowingly create a duplicate reservation.
- A shared changed filename is not automatically a conflict. Where multiple lanes legitimately modify the same file, preserve and reconcile all valid changes. Never resolve shared schema, migration history, ADR index, architecture, roadmap, changelog, work-log, or contract conflicts by wholesale `ours`/`theirs` selection unless the maintainer explicitly confirms that one side is obsolete.
- Database migrations are append-only lane-owned artifacts. Do not edit, replace, rename, or delete another active lane's migration merely to avoid a conflict. After another migration merges, rebase/merge against current `main` and validate the remaining migration sequence on top of it.
- Merge active PRs into `main` one at a time. Immediately before merge, perform a parallel-PR collision check against the other relevant active PRs for overlapping files, schema/model areas, migrations, ADR numbers, enums/events, API/domain contracts, and contradictory documentation.
- When another PR merges while a lane remains open, that lane must synchronize with the new `main` before it is merge-ready. Deliberately reconcile shared changes, review the complete resulting diff, and rerun all required validation. A previously green result does not authorize merge after the integration base has materially changed.
- Never silently discard another lane's valid history during synchronization. For append-only/historical files such as changelogs, technical work logs, ADR indexes, and migration history, the integrated result normally retains both lanes' valid entries.
- If parallel work exposes a substantive cross-lane architecture or product conflict rather than a mechanical Git conflict, stop incompatible implementation and coordinate the decision through the applicable repository documentation and coordination issue before proceeding.
- Before declaring a PR merge-ready, verify its exact head SHA after synchronization and confirm that the reviewed/tested head is the one being merged.

## GitHub connector operating procedure

For repository work performed through a GitHub connector or API-backed tool, use the following sequence by default:

**READ → VERIFY → WRITE → VERIFY → PR**

### Read and verify before every write

- Resolve the current repository, branch, path and intended scope before mutating anything.
- Fetch the exact target file from the exact target branch immediately before editing it. Use the returned current blob SHA for an existing-file update.
- Never reconstruct an existing repository file from chat memory, an earlier tool response, a stale local copy or a previous branch version when the current target file can be fetched.
- Before continuing an existing branch, compare or otherwise verify it against current `main`. If it is behind and contains no unique conflicting work, fast-forward it rather than creating unnecessary replacement branches.
- Prefer the existing focused branch when a fix or follow-up belongs to the same PR scope.

### Write one dependency at a time

- Make one dependent repository write at a time and wait for its result before starting the next dependent write.
- After updating a file, treat the returned content SHA as authoritative for any subsequent update to that same file.
- Do not run parallel writes to the same path or assume a mutation succeeded because it was requested.
- Do not bypass the branch/PR workflow by writing to `main` because a connector action is inconvenient or blocked.

### Verify after every important mutation

- Read back or otherwise verify the exact branch/file state after an important write before declaring it complete or building further dependent work on top of it.
- Before opening a PR, compare the feature branch with `main`, inspect the complete changed-file set and confirm there are no unintended files, stale statements or duplicated sources of truth.
- After opening a PR, verify the PR base, head, exact head SHA, changed files and required quality-gate run.

### Failure handling

If a connector/API operation fails, times out, or is blocked:

1. Do **not** blindly repeat the identical mutation.
2. Re-read GitHub state first to determine whether the requested change actually occurred despite the failed response.
3. Diagnose the current branch, file SHA, path, PR state or other evidenced cause before retrying.
4. Retry only after current state is known and the operation is corrected where necessary.
5. Do not immediately switch to low-level Git object/ref APIs merely to bypass a blocked normal contents/PR action. Use an alternate route only when it is justified by the repository task itself and current state has been verified.
6. If the connector continues to block a legitimate operation, preserve the safe repository state and ask the maintainer for the smallest manual action required rather than broad manual editing.

### Frozen-head verification workflow

Use a frozen-head verification cycle as the default completion workflow for implementation and substantive documentation PRs. This is an efficiency rule that preserves every existing safety gate; it does not authorize skipping tests, documentation, diff review, exact-head verification, migration replay, security checks, or required approvals.

1. **Complete the slice before final CI.** Finish the scoped implementation, focused tests, mandatory documentation, coordination updates, and PR-body reconciliation first. Resolve all known review findings and current `main`/parallel-PR integration issues before treating the branch as ready for final validation.
2. **Run one complete pre-freeze audit.** Review the entire changed-file set and complete diff, verify append-only/historical files have no unintended rewrites, confirm no stale or contradictory documentation remains, and run any cheap/local validation available before final required CI.
3. **Freeze the exact head.** Record the exact head SHA and stop discretionary edits while the required quality gates run. Do not make speculative refactors, wording polish, unrelated cleanup, or “while CI runs” improvements that would create a new head without new evidence.
4. **Use exact-head results only.** A green result authorizes only the exact tested head and the materially unchanged merge base. If the head changes, or `main` changes in a way that requires synchronization, the previous green result is no longer sufficient.
5. **A failure reopens the head.** If CI, review, a security finding, a merge-base change, or maintainer feedback produces new evidence of a defect, inspect the actual evidence and make the smallest justified correction on the same scoped branch. Update documentation only when the correction changes what the documentation must say.
6. **Re-audit after an evidence-driven fix.** Recheck the affected area plus complete-diff integrity, freeze the new exact head, and rerun the full required gates. Do not bundle unrelated improvements into the correction merely because another CI run is now required.
7. **Merge only after the final frozen head is green.** Immediately before merge, verify the exact head SHA, required gate conclusions, mergeability, relevant parallel-PR collision state, and any required synchronization with current `main`.

The target shape is therefore: **implementation → tests → required docs → full diff audit → freeze head → final CI → merge**. If final CI fails: **diagnose evidenced failure → minimal correction → targeted + full-diff re-audit → freeze new head → full required CI**.

### CI and PR correction

- A failed quality gate stays on the existing PR branch unless the branch itself is irreparably wrong.
- Inspect the actual failing job/step/logs, fix the evidenced cause on the same branch, verify the new head SHA and let the required gates rerun.
- Never merge a red or still-running required gate merely to move forward.
- Merge only the reviewed exact head that passed the required gates; if the head changes after verification, re-check the new head before merge.

## New-chat / resumed-work reading rule

Before continuing substantial HestivaOS work in a new or resumed development chat, read at minimum:

1. `AGENTS.md`;
2. the relevant current-state architecture/business documentation and ADRs for the task;
3. `docs/CROSS_SYSTEM_COORDINATION.md` when the task affects another repository, provider, or system; and
4. the applicable active coordination issue identified there.

Current routes include Website ↔ HestivaOS Slice 5M in Issue #73 and WhatsApp/Messenger ↔ HestivaOS messaging in Issue #116. Prefer verified repository state over remembered conversation details if they conflict.

## Required update matrix

For every implementation, inspect all rows that apply and update **every listed file whose content is affected**. `docs/TECHNICAL_WORK_LOG.md` and `docs/CHANGELOG.md` are mandatory for every implementation change. An applicable ADR is mandatory when a durable architectural or operational decision is introduced or superseded. Do not edit an unrelated document merely to satisfy automation.

| Change | Required documentation |
| --- | --- |
| Architecture, repository structure, or component boundaries | `docs/ARCHITECTURE.md`, `docs/WHY.md`, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and the applicable ADR under `docs/decisions/` |
| Infrastructure, Cloudflare, Railway, Supabase, deployment, or CI/CD | `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/RECOVERY_GUIDE.md`, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and the applicable ADR |
| Environment variables or runtime configuration | `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md` and/or `docs/RECOVERY_GUIDE.md` as operationally applicable, `docs/TECHNICAL_WORK_LOG.md`, and `docs/CHANGELOG.md` |
| Authentication or authorization | `docs/ARCHITECTURE.md`, `docs/ENVIRONMENT.md` when configuration changes, `docs/RECOVERY_GUIDE.md`, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and the applicable ADR for a decision change |
| Database schema, migrations, or Prisma models | `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/RECOVERY_GUIDE.md`, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and the applicable ADR for a decision change |
| API routes or contracts | `docs/ARCHITECTURE.md`, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and consumer/operational documentation affected by the contract |
| Business workflows | `docs/ARCHITECTURE.md`, `docs/WHY.md` when rationale changes, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and `docs/ROADMAP.md` when planned work changes |
| Recovery or operational procedures | `docs/RECOVERY_GUIDE.md`, `docs/DEPLOYMENT.md` and/or `docs/ENVIRONMENT.md` as applicable, `docs/TECHNICAL_WORK_LOG.md`, and `docs/CHANGELOG.md` |
| Development workflow or repository tooling | `docs/README.md`, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and `docs/ROADMAP.md` when planned work changes |
| Dependencies | `docs/ARCHITECTURE.md` or `docs/WHY.md` when design changes, `docs/DEPLOYMENT.md` when build/runtime behavior changes, `docs/TECHNICAL_WORK_LOG.md`, `docs/CHANGELOG.md`, and an ADR for a durable technology choice |

`docs/ROADMAP.md` records only verified planned work; update it when work is added, reprioritized, completed, or made obsolete. Update `docs/WHY.md` only when engineering rationale changes. Update `docs/README.md` when the documentation system, document map, or documentation workflow changes.

## Implementation and PR checklist

Before declaring an implementation complete:

1. Reconcile the changed implementation against the matrix above.
2. Update current-state documents and append the historical work-log and changelog entries.
3. Run repository validation, Markdown validation, `git diff --check`, and a secret scan appropriate to the repository.
4. Review the complete diff and confirm no stale, contradictory, speculative, or duplicated documentation remains.
5. Freeze the exact head and run the required final quality gates; after freeze, change the head only for an evidenced failure/review/integration correction, then re-audit and rerun the full required gates on the new exact head.

Every implementation PR body must explicitly include:

- **Documentation updated:** the documentation files changed and why.
- **Verification performed:** the exact checks and outcomes.
- **Files changed:** a complete file list or an accurate categorized list.
- **No stale documentation remains:** an affirmative statement based on review.
- **Coordination source:** required when the PR materially changes a cross-system contract; link the applicable coordination issue/checkpoint and the permanent repository document/ADR that records the implemented result.

After opening a cross-system PR, post the PR link and a short contract-impact summary back to the applicable coordination issue so other development chats have one predictable discovery point.

Documentation-only typo/formatting changes, README-only formatting, comment-only code changes, and license-only changes do not require historical documentation updates. They must not be used to conceal an implementation change.
