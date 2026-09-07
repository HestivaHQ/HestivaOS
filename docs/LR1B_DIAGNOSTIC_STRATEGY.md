# LR-1B Targeted Diagnostic Strategy

## Purpose

LR-1B remains the final production operational acceptance gate. It must not be used as the primary debugger for a known failing scenario.

When a full acceptance run exposes a repeatable failure, diagnose that boundary with a focused production-safe diagnostic before changing product code again. The diagnostic should collect the smallest useful state needed to distinguish product behavior, stale deployment, API/state convergence, and test-selector problems.

ADR-0096 adds the LR-1B Testing Pipeline v2 execution model. It supersedes ADR-0095 only for manual-only diagnostic dispatch and the former prohibition on all screenshots/traces. The diagnostic purpose, strict product boundaries, provider safety, and rule that diagnostics cannot establish acceptance PASS remain unchanged.

## Workflow scopes

The `HestivaOS LR-1B Operational Acceptance` workflow supports:

- `full` — the canonical acceptance lane. It remains manually authorized with the exact `RUN LR1B ACCEPTANCE` confirmation and excludes the targeted diagnostic spec.
- `c2-diagnostic` — the focused Customer-to-Property preselection diagnostic. It creates its own disposable Customer through the ADMIN UI, edits it through the ADMIN UI, follows the real Property deep link, and records bounded Customer selector/response evidence before asserting the product boundary.

During the approved pre-launch automation window, a push to `main` may automatically run the current deployed diagnostic only when repository variable `HESTIVA_LR1B_AUTOMATION_ENABLED` is exactly `true`. The workflow first proves that both production surfaces serve the exact pushed Git SHA: Cloudflare web `/api/revision` must match, Railway `/api/v1/ready` must be ready and report the same revision, and any `unknown`, mismatch or unavailable response fails closed before Playwright starts.

Only one production LR-1B workflow may execute at a time. Automatic diagnostics do not gain authority to run the full launch-certification lane.

Both scopes retain the production base URL, real role authentication, acceptance safety guard, and Meta/provider exclusion. The diagnostic does not call Meta, send correspondence, use database fixture shortcuts, or mutate provider configuration.

## Failure evidence

Pipeline v2 may retain a Playwright trace and screenshot only when a run fails. Video remains disabled. Failure artifacts:

- contain only disposable acceptance journeys;
- must not include browser auth-state files;
- must not log credentials, tokens, provider secrets or unrestricted customer payloads;
- use short retention;
- are diagnostic evidence only and cannot mark a scenario PASS.

If evidence cannot be captured safely for a scenario, disable that evidence for the scenario rather than weakening the underlying acceptance boundary.

## Defect loop

For a repeatable acceptance failure:

1. Preserve the failing connected/full-run evidence.
2. Add or use a focused diagnostic that reproduces only the affected product boundary and emits decisive bounded state.
3. Do not change product code until the diagnostic identifies the failing boundary.
4. Fix the product root cause and add a focused regression check that can run before deployment where practical.
5. Merge only the exact reviewed head after the four authoritative PR gates are green.
6. Wait until production proves that both web and API are serving that exact merged SHA.
7. Run the focused deployed diagnostic automatically when the approved automation switch is enabled, or manually when it is not.
8. Only after the focused check passes, rerun the affected connected acceptance bundle and later the full LR-1B launch-certification lane.

Do not weaken acceptance assertions or extend timeouts merely to obtain a pass. Do not turn diagnostics into permanent alternate product behavior.

## Bundle execution

A failure in one connected journey should not unnecessarily hide unrelated acceptance evidence. Independent diagnostics should own disposable prerequisites where that can be done through supported product UI/API boundaries without bypassing the business journey being accepted. Truly dependent handoffs remain connected.

The target Pipeline v2 progression is:

PR regression coverage → exact-head merge → exact deployed revision proof → independent deployed diagnostics → connected affected bundle → final full LR-1B certification.

The first automated scope is C2 while Bundle 2 is being repaired. W1, Q1/Q2 and later bundle diagnostics should be isolated deliberately as their supported prerequisites are established; they are not considered accepted merely because an isolated diagnostic passes.
