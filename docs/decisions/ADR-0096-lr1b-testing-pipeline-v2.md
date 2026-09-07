# ADR-0096: Deployment-gated LR-1B testing pipeline v2

## Status

Accepted.

Supersedes ADR-0095 only where that ADR requires targeted diagnostics to remain manual-only and forbids bounded failure trace/screenshot capture. ADR-0095 remains authoritative for diagnostic intent, real product boundaries, provider safety, no database fixture shortcuts, and the rule that targeted diagnostics cannot mark launch acceptance PASS.

## Context

LR-1B is the final whole-OS operational acceptance gate, but repeated manual dispatches made a known failing scenario expensive to diagnose. The production web and API deploy independently through Cloudflare Workers Builds and Railway, so a GitHub `main` update does not itself prove that the production surfaces are serving revisions compatible with the reviewed head.

Cloudflare currently rebuilds the web surface for the relevant web/test workflow changes, while Railway may legitimately skip an API deployment when none of its watched/API-relevant files changed. Requiring both surfaces to report the identical repository HEAD therefore creates a false deployment block for web/test-only commits even when the running API is the correct latest API build.

Using full LR-1B as the primary debugger, starting a deployed test immediately on a `main` push, or forcing Railway to redeploy unchanged API code would weaken the deployment model rather than solve the feedback problem.

## Decision

HestivaOS uses a three-layer LR-1B testing model:

1. Normal PR validation remains the four authoritative non-deploying quality gates.
2. Deployed targeted diagnostics may run automatically after a `main` update only when pre-launch LR-1B automation is explicitly enabled and production proves a compatible deployment across the Cloudflare web and Railway API surfaces.
3. Full LR-1B remains a separately authorized launch-certification run and retains the exact `RUN LR1B ACCEPTANCE` manual confirmation.

The deployment proof is fail-closed and surface-aware:

- The Cloudflare web surface must report the exact expected Git SHA through public, non-secret `/api/revision` metadata.
- The Railway API must be ready and report a valid Git-trigger revision from `RAILWAY_GIT_COMMIT_SHA` through existing health/readiness metadata.
- The API revision may equal the expected SHA, or it may be an older Git ancestor only when repository history proves that every file changed since that API revision is in an explicit API-lag-safe set: `apps/web/**`, `docs/**`, `.github/**`, `AGENTS.md`, `README.md`, or `.gitignore`.
- Full Git history is checked out for this proof. A non-ancestor API revision, invalid/unknown metadata, unavailable Git diff, any change outside the API-lag-safe set, an unready API, a non-exact web revision, or an unavailable surface blocks Playwright.

This intentionally uses an allowlist for acceptable API lag rather than trying to duplicate Railway's watched-file configuration in GitHub. Root dependency/configuration files and any unclassified path therefore fail closed and require the API to converge to the expected revision.

Only one production LR-1B run may execute at a time. Automatic runs are gated by repository variable `HESTIVA_LR1B_AUTOMATION_ENABLED=true`; absence or any other value disables automatic mutation. This switch is pre-launch infrastructure and must be disabled when the automated diagnostic window is no longer approved.

Failure evidence may retain Playwright trace and screenshot output only on failure. Video remains disabled. Artifacts use disposable acceptance data, exclude browser auth-state files, must not contain credentials/provider secrets, and use short retention. Failure evidence is diagnostic only and cannot establish PASS.

The first automated deployed scope is the current C2 diagnostic. Additional independent diagnostics and connected bundle scopes may be added as their prerequisites become isolated without bypassing real product UI/API boundaries. A scenario is accepted only by the applicable connected bundle/full LR-1B evidence, never by source tests or diagnostics alone.

Live Meta remains excluded. Pipeline v2 does not add Meta credentials, provider sends, provider configuration access, external customer correspondence, or launch-reset authority.

## Consequences

- GitHub may begin a verifier on `main` push, but Playwright does not start until the web is exact and the API is either exact or proven compatible by Git history plus the conservative API-lag-safe allowlist.
- Railway does not need to redeploy unchanged API code solely to make its revision string equal a web/test-only repository HEAD.
- Any ambiguous or potentially API-affecting diff still blocks acceptance until Railway deploys the matching API revision.
- Debugging feedback no longer requires manual Actions dispatch for every approved deployed diagnostic iteration once the automation variable is enabled.
- Full launch certification remains deliberately manual and strict.
- Public revision metadata exposes only a Git commit identifier, not credentials or configuration values.
- Failure artifacts improve diagnosis while remaining bounded and short-lived.
- The repository must disable the automatic pre-launch switch before ordinary production operation if LR-1B mutation is no longer appropriate.

## Alternatives considered

### Force Railway to redeploy every repository commit

Rejected because it performs unnecessary production redeployments for web/test/documentation-only commits and hides the independent deployment topology instead of modelling it correctly.

### Require identical web and API SHA on every run

Rejected because Railway legitimately skips deployment when no watched/API-relevant files changed, creating a false block even when the running API is the correct latest API build.

### Run LR-1B immediately on every push to main

Rejected because Cloudflare and Railway can converge at different times, creating a stale or mixed-deployment race.

### Keep all diagnostics manual

Rejected because repeated button-pushing adds no acceptance scrutiny once deployment identity and safety gates can be proven automatically.

### Use Codex or a local runner as deployment authority

Rejected because canonical revision, CI, deployment and acceptance authority belong to GitHub plus the deployed HestivaOS surfaces.

### Remove or weaken failing acceptance assertions

Rejected because the goal is faster evidence, not a lower launch-readiness standard.

## Review trigger

Review this decision at LR-1B completion, before launch-baseline reset, if the Railway watched-path topology changes materially, if a path currently classified API-lag-safe begins affecting API build/runtime behavior, if automatic diagnostics begin mutating non-disposable production data, if failure artifacts can expose sensitive state, or if Cloudflare/Railway deployment topology changes.
