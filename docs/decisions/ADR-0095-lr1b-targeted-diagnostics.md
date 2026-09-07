# ADR-0095: Diagnose failed LR-1B scenarios before changing product code

## Status

Accepted.

## Context

LR-1B operational acceptance is intended to prove that HestivaOS can complete real pre-launch operating cycles through the production UI and API boundaries. During Bundle 2, the same C2 Customer-to-Property handoff failed repeatedly. Using the whole LR-1B lane as the primary debugger caused slow feedback, serially blocked later scenarios, and encouraged product changes before the exact failing browser/server boundary had been observed.

The acceptance lane must remain strict, but debugging a failed acceptance scenario needs faster and more decisive evidence than repeated full-suite production runs.

## Decision

A failed LR-1B scenario enters a targeted diagnostic loop before further product changes are made.

1. Whole-OS LR-1B remains the authoritative acceptance gate. Targeted diagnostics cannot mark an acceptance scenario PASS and cannot weaken its assertions.
2. A targeted diagnostic is scoped to the smallest failed product journey and uses the same real authenticated product boundaries and provider-safety envelope as LR-1B. It may create disposable acceptance data through the product UI where required to reproduce the failure.
3. The diagnostic must record sanitized boundary evidence sufficient to distinguish product-state, API, browser-state, deployment/version, and test-observation failures. It must not log credentials, tokens, sensitive customer data, provider secrets, or unrestricted response bodies.
4. Product code is not changed again for the failure until the diagnostic evidence identifies the failing boundary.
5. Once the cause is proven, the product fix receives the smallest appropriate regression coverage in normal PR validation where practical. After deployment, the targeted production check verifies the repaired boundary before the larger LR-1B bundle or whole-OS lane is rerun.
6. Diagnostic scopes are manual-only and retain the exact LR-1B confirmation and runtime enablement guards. They do not gain Meta/provider credentials, external-delivery authority, database fixture shortcuts, screenshot/trace/video capture, or automatic triggers.
7. Independent acceptance scenarios should not be serially blocked merely for test convenience. Shared prerequisites may remain serial where product state genuinely depends on them, but unrelated scenarios should be structured so one failure does not unnecessarily hide later defects.

## Consequences

- Failed acceptance scenarios produce actionable evidence before another product deployment.
- Full LR-1B runs become less frequent during debugging and remain focused on acceptance rather than diagnosis.
- Some diagnostic-only test code and workflow routing are maintained, but they are deliberately bounded and cannot substitute for acceptance evidence.
- A diagnostic that proves the test observation itself is wrong is fixed in the test layer; a diagnostic that proves product behavior is wrong leads to a product fix and regression coverage.
- The safety boundary remains unchanged: no live Meta actions, no external customer correspondence, no database fixture shortcuts, and no weakening of acceptance criteria.

## Alternatives considered

### Continue rerunning the full LR-1B lane after every attempted fix

Rejected because it provides slow feedback and can hide downstream failures behind serial prerequisites.

### Increase timeouts or relax assertions until the scenario passes

Rejected because it can turn a real product defect into a false acceptance result.

### Debug by mutating production data directly

Rejected because it bypasses the real product journey and weakens the value and safety of operational acceptance.

## Review trigger

Review this decision if targeted diagnostics begin duplicating large portions of LR-1B, require broader production privileges, or materially slow normal PR validation. In that case, consolidate the diagnostic infrastructure without weakening the acceptance or provider-safety boundaries.
