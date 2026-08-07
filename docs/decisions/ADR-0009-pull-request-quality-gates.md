# ADR-0009: Pull-request quality gates

- **Status:** Accepted
- **Date:** 2026-08-07
- **Supersedes:** ADR-0008 only for the standalone workflow used to execute documentation validation; its documentation policy remains accepted.

## Context

The repository had a pull-request documentation check but no unified check that the locked dependency graph, TypeScript workspaces, builds, and tests remained valid together. The API's Jest command also failed because it had no tests. Verification must not become a competing deployment authority.

## Decision

Pull requests targeting `main` run `.github/workflows/pr-quality-gates.yml` on Node.js 24. The read-only workflow installs dependencies from the root lockfile with `npm ci`, validates the documentation policy, scans tracked files for high-confidence secret formats, runs root typecheck/build/test, builds each workspace independently, and checks diff whitespace. It contains no deployment step and receives no production credentials.

The API Jest foundation tests monitoring and request-correlation behavior with mocked dependencies. The existing root test command remains the workspace orchestrator. The web workspace's explicit no-tests command is retained because web test tooling and coverage are outside this focused decision; it does not mask API failures.

## Consequences

- Pull requests receive one diagnosable verification job before merge.
- Documentation validation is consolidated into the quality workflow rather than running in a second standalone workflow.
- Cloudflare native Git and Railway retain their existing deployment authority; CI verification cannot deploy either application.
- The repository-local secret scan is intentionally high-confidence and is not a substitute for platform secret protection or review.

## Alternatives considered

Keep only documentation validation; use `--passWithNoTests`; enable deployment in the verification workflow; introduce unrelated web test or lint tooling.

## Review trigger

Review when branch protection requirements, supported Node.js versions, workspace test tooling, or required verification gates change.
