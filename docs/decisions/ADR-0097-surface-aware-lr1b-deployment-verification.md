# ADR-0097: Surface-aware LR-1B deployment verification

## Status

Accepted.

Supersedes ADR-0096 only where ADR-0096 requires the Cloudflare web and Railway API surfaces to report the identical expected repository SHA before deployed LR-1B diagnostics can begin. ADR-0096 remains authoritative for the Pipeline v2 automation window, one-at-a-time production acceptance, failure-only evidence, full manual certification, and provider/reset safety boundaries.

## Context

Pipeline v2 correctly blocks Playwright until production deployment identity is proven. In operation, however, HestivaOS web and API deploy independently. Cloudflare may build a web/test-only repository update while Railway legitimately skips the API deployment because none of its watched/API-relevant files changed.

That means the running Railway API can remain the correct latest API build while reporting an older repository commit than the web surface. Requiring exact repository-head equality across both surfaces creates a false deployment failure and encourages an unnecessary manual Railway redeploy of unchanged API code.

The verifier still must fail closed. It cannot simply accept any older API revision because an intervening commit may contain API, dependency, schema, build or root-configuration changes that do require Railway convergence.

## Decision

LR-1B deployment proof becomes surface-aware while retaining exact web identity and fail-closed API compatibility.

1. Cloudflare web `/api/revision` must report the exact expected Git SHA.
2. Railway API `/api/v1/ready` must be healthy and report a valid 40-character Git revision.
3. If Railway reports the exact expected SHA, deployment proof passes normally.
4. If Railway reports an older SHA, Git must prove that SHA is an ancestor of the expected SHA and that every intervening changed file belongs to an explicit API-lag-safe allowlist.
5. The initial API-lag-safe paths are `apps/web/**`, `docs/**`, `.github/**`, `AGENTS.md`, `README.md`, and `.gitignore`.
6. Any path outside that allowlist blocks the run until Railway reports the expected revision. This includes root dependencies/configuration and all unclassified paths.
7. The workflow checks out full Git history (`fetch-depth: 0`) so ancestry and diff proof are available locally. Invalid/unknown revisions, non-ancestor API revisions, unavailable history/diff, unready API, unavailable surfaces, or a non-exact web revision all block Playwright.

The allowlist is intentionally conservative and independent of Railway's control-plane watched-file configuration. The verifier proves only that the repository changes separating the deployed API revision from the expected head are known not to require API redeployment; it does not attempt to reproduce or trust Railway's internal path rules.

## Consequences

- Web/test/documentation/CI-only commits no longer require an unnecessary Railway API redeploy solely to make revision strings equal.
- The verifier still blocks mixed deployments whenever any potentially API-affecting file changed after the running API revision.
- Railway remains the API deployment authority; GitHub does not force or simulate a deployment.
- The current LR-1B safety boundaries, Meta exclusion, manual full-certification confirmation, concurrency and failure-artifact rules are unchanged.
- If a currently safe-listed path later gains API build/runtime significance, this ADR and the allowlist must be reviewed before relying on API lag across that path.

## Alternatives considered

### Force Railway to deploy every repository commit

Rejected because it adds unnecessary production deployment churn for commits with no API effect and hides the independent deployment topology instead of modelling it correctly.

### Keep exact SHA equality for both surfaces

Rejected because Railway can legitimately skip a deployment when its watched files are unchanged, producing a false acceptance blocker.

### Accept any healthy older API revision

Rejected because it could test against stale API code after an API-affecting commit and would weaken the deployment gate.

### Duplicate Railway watched paths exactly in the verifier

Rejected because Railway control-plane configuration can drift independently. A conservative repository-owned allowlist is easier to audit and fails closed for unclassified changes.

## Review trigger

Review this decision before launch-baseline reset, whenever Railway watched-path topology changes materially, whenever a safe-listed path begins affecting API build/runtime behavior, or whenever the Cloudflare/Railway deployment topology changes.
