# LR-1B Targeted Diagnostic Strategy

## Purpose

LR-1B remains the final production operational acceptance gate. It must not be used as the primary debugger for a known failing scenario.

When a full acceptance run exposes a repeatable failure, diagnose that boundary with a focused production-safe diagnostic before changing product code again. The diagnostic should collect the smallest useful state needed to distinguish product behavior, stale deployment, API/state convergence, and test-selector problems.

## Workflow scopes

The manual `HestivaOS LR-1B Operational Acceptance` workflow supports:

- `full` — the canonical acceptance lane. The targeted diagnostic spec is excluded.
- `c2-diagnostic` — the focused Customer-to-Property preselection diagnostic. It creates its own disposable Customer through the ADMIN UI, edits it through the ADMIN UI, follows the real Property deep link, and records the Customer select value/options, visible error state, and relevant selector-response evidence before asserting the product boundary.

Both scopes retain the existing exact confirmation phrase, production base URL, real ADMIN authentication, acceptance safety guard, and no-screenshot/no-trace posture. The diagnostic does not call Meta, send correspondence, use database fixture shortcuts, or mutate provider configuration.

## Defect loop

For a repeatable acceptance failure:

1. Preserve the failing full-run evidence.
2. Add or use a focused diagnostic that reproduces only the affected product boundary and emits decisive state.
3. Do not change product code until the diagnostic identifies the failing boundary.
4. Fix the product root cause and add a focused regression check that can run before deployment where practical.
5. Run the focused production diagnostic against the deployed revision.
6. Only after the focused check passes, rerun the affected acceptance bundle/full LR-1B lane.

Do not weaken acceptance assertions or extend timeouts merely to obtain a pass. Do not turn diagnostics into permanent alternate product behavior.

## Bundle execution

A failure in one connected journey should not unnecessarily hide unrelated acceptance evidence. As Bundle 2 matures, independent scenarios should own disposable prerequisites where that can be done without bypassing the product UI or changing the business journey being accepted. Truly dependent handoffs remain connected.
