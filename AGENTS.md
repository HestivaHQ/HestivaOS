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
- For decisions affecting both the public website and HestivaOS, synchronize the permanent documentation in both repositories and the active coordination issue/contract before incompatible implementation proceeds.

## Branch and pull-request rule

Do not write implementation or documentation changes directly to `main` by default.

- Create or use a focused feature/documentation branch.
- Make the scoped changes on that branch.
- Run the required validation and review the complete diff.
- Open a pull request targeting `main`.
- A direct write to `main` is allowed only when the maintainer explicitly authorizes that exception for the specific change. General approval to make a change does **not** waive the branch/PR rule.
- If a tool unexpectedly writes directly to `main`, report the deviation immediately and reconcile any affected documentation instead of concealing it.

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

### CI and PR correction

- A failed quality gate stays on the existing PR branch unless the branch itself is irreparably wrong.
- Inspect the actual failing job/step/logs, fix the evidenced cause on the same branch, verify the new head SHA and let the required gates rerun.
- Never merge a red or still-running required gate merely to move forward.
- Merge only the reviewed exact head that passed the required gates; if the head changes after verification, re-check the new head before merge.

## New-chat / resumed-work reading rule

Before continuing substantial HestivaOS work in a new or resumed development chat, read at minimum:

1. `AGENTS.md`;
2. the relevant current-state architecture/business documentation and ADRs for the task; and
3. any active coordination issue when the task affects another system, especially Website ↔ HestivaOS integration work.

Prefer verified repository state over remembered conversation details if they conflict.

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

Every implementation PR body must explicitly include:

- **Documentation updated:** the documentation files changed and why.
- **Verification performed:** the exact checks and outcomes.
- **Files changed:** a complete file list or an accurate categorized list.
- **No stale documentation remains:** an affirmative statement based on review.

Documentation-only typo/formatting changes, README-only formatting, comment-only code changes, and license-only changes do not require historical documentation updates. They must not be used to conceal an implementation change.
