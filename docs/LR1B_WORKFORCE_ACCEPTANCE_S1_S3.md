# LR-1B Workforce Acceptance — S1 to S3

Status: IMPLEMENTED IN HARNESS / S1 RERUN REQUIRED
Date: 2026-09-02
Canonical programme: `docs/LR1B_OPERATIONAL_ACCEPTANCE_V1.md`

## Purpose

This focused note records the implementation boundary for the next LR-1B operational-acceptance slice after role foundation run #8 and the Employee workforce-link product fix merged in PR #278.

It does not mark S1, S2 or S3 as passed. Only a successful manual LR-1B workflow run against the deployed merged head can provide that evidence, after which the canonical LR-1B ledger must be reconciled.

## Run #9 evidence

LR-1B run #9 executed on deployed `main` `e4cda2807f86abcb56f05bba474461be1043095f`. The existing authentication/role foundation remained healthy: all eight acceptance-auth setup tests passed, the ADMIN office-interface test passed, and the Supervisor plus both Technician role-interface checks passed.

S1 then failed while verifying the first Employee Record after save. The Employee Records search supports email as a server-side search term, but `.employeeCard` intentionally renders the employee display name, job/crew context, OS-access summary and employment status rather than the contact email. The harness incorrectly searched by email and then required that same email to appear inside the returned card text. The correct Employee record therefore could not satisfy the locator even when the search result was present. S2 and S3 did not run because the S1-S3 suite is serial/fail-closed.

The run #9 fix kept email as the real UI search key and identified the returned card by the deterministic visible Employee name/status. No production Employee API, persistence, authorization or UI behavior changed.

## Run #10 evidence

LR-1B run #10 executed on deployed `main` `680d70fbe31ff0b17496e2786cda8da8b74f737b`. The same twelve foundation checks again passed. The run progressed beyond the run #9 card-text failure and failed during the next Employee status mutation.

The failure was a harness synchronization defect. `searchEmployee()` unconditionally waited for a fresh `GET /employees?search=...` response every time it ran. After the first Employee save, the search input already contained the same controlled email. Filling the same value does not trigger React state change or another Employee request, so the harness waited for a network event that the product had no reason to emit and timed out. This is not evidence of an Employee persistence, status-mutation or authorization defect.

The run #10 fix made the response wait conditional on the filter value changing, while direct card verification handled an already-active filter.

## Run #11 evidence

LR-1B run #11 executed on deployed `main` `223e45a9700465eb47e683f4e41def27492840ff`. All eight acceptance-auth tests, the ADMIN office-interface check, the Supervisor interface check and both Technician mobile-interface checks passed again. S1 failed during the first Employee create/reuse decision; S2 and S3 remained correctly skipped by the serial suite.

Run #11 proved that even a conditional `waitForResponse` remained the wrong abstraction for this UI. Employee Records owns a debounced client-side search state, while the acceptance requirement is the visible product state, not a particular transport event. The test timed out waiting for an inferred Employee GET response before any Employee persistence assertion failed.

The rerun fix removes `waitForResponse` from Employee acceptance entirely. For create/reuse detection, it uses the existing Workforce identity links panel as the settled real-UI source: that panel loads Employee, User and Technician options together, and the controlled Technician option created earlier in S1 is used as the load-completion sentinel. Only after that option is visible does the harness inspect the deterministic Employee reference option to decide whether to reuse or create the Employee Record. Existing records are then located through the normal Employee search box and deterministic visible Employee card. No product API, persistence, authorization or UI behavior changes for this defect.

## S1 — Technician and Employee records

The ADMIN acceptance project now uses the real browser UI to establish the two controlled Technician identities required by later field execution. It:

- creates or reuses deterministic Technician records identified by the controlled Technician acceptance email addresses;
- saves controlled skills and disposable acceptance notes;
- mutates the Job Leader Technician from ACTIVE to INACTIVE and back to ACTIVE, proving the workforce-status mutation while leaving the final operational state usable;
- creates or reuses deterministic Employee Records for the two Technician identities;
- waits for the Workforce identity links panel's controlled Technician option before deciding Employee create/reuse state, proving the panel's combined Employee/User/Technician load has settled through visible UI;
- identifies an existing Employee Record by its deterministic Employee reference option and then locates its card through the real email search plus visible Employee name;
- mutates the Job Leader Employee Record from ACTIVE to INACTIVE and back to ACTIVE;
- uses the Employee Records **Workforce identity links** panel introduced by PR #278 to link each Employee Record to the existing HestivaOS User and authoritative Technician through the normal ADMIN UI;
- reloads and verifies that the User and Technician links persist.

No direct PostgreSQL/Supabase mutation, test-only endpoint, hidden API fixture creation, role bypass or Auth-account creation is permitted by this slice. User role/access remains owned by User Access. Technician status remains owned by the Technician domain. Field authorization remains server-authoritative through the existing `User -> ACTIVE EmployeeRecord -> ACTIVE Technician` chain and Work Order assignment rules.

## S2 — Crew membership and leadership

The ADMIN acceptance project creates or reuses one deterministic disposable crew named `LR1B Acceptance Crew`. It uses the normal Crew UI to:

- keep both controlled Technician records as active members;
- persist an explicit Crew Leader;
- reload the saved crew;
- change leadership to the second Technician and verify persistence;
- restore the intended Job Leader Technician as Crew Leader for later Work Order staffing scenarios.

This proves create/edit, two-member persistence and leadership mutation without changing application roles or treating Crew Leader as the SUPERVISOR role.

## S3 — Shift lifecycle

The ADMIN acceptance project uses the normal Shift Planning UI to create a disposable `LR1B Acceptance Shift` for the acceptance crew. It exercises:

- shift create;
- crew lookup and selection;
- designated-Technician selection;
- Work Order search while deliberately leaving the shift unlinked so this workforce slice does not attach test scheduling to an unrelated existing Work Order;
- schedule status and location edit;
- reload persistence;
- copy-to-date through the product prompt;
- deletion of both disposable shift rows.

The final S3 state intentionally leaves no LR-1B acceptance shift residue. The Employee, Technician and Crew records remain as controlled disposable acceptance workforce because later W/T/O scenarios require them; they remain eligible for the final launch-baseline reset under the canonical LR-1B programme.

## Safety and rerun behavior

The slice remains inside the existing manual-only LR-1B workflow, separate authenticated ADMIN session, provider-edge request guard, no screenshot/trace/video policy and Meta exclusion. Deterministic record names/references make reruns reconcile existing acceptance workforce rather than intentionally multiplying fixtures. The tests are serial and fail closed: if S1 fails, S2/S3 do not become acceptance evidence.

Normal pull-request CI does not execute production mutations. It syntax-checks the acceptance source and verifies source-level invariants requiring the real Technician, Employee, Crew and Shift browser routes while rejecting direct Supabase/Prisma/database/fetch/provider shortcuts in the workforce spec. It also guards against regressing to the invalid Employee assumptions discovered in runs #9–#11: matching hidden email text inside the Employee card or coupling acceptance to `waitForResponse` transport events.

## Acceptance rule

After this harness change is merged and deployed, manually run `HestivaOS LR-1B Operational Acceptance` using the existing exact confirmation and environment guard. Reconcile the canonical ledger from the actual run result:

- S1 PASS only if Technician/Employee mutation, linking and reload persistence all succeed;
- S2 PASS only if crew membership/leadership changes persist through the UI;
- S3 PASS only if create/edit/reload/copy/delete all succeed;
- any failure becomes the next focused defect lane before later Work Order/Technician execution scenarios proceed.
