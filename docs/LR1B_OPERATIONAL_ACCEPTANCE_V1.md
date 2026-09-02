# LR-1B Operational Acceptance V1

Status: ACTIVE
Started: 2026-09-02
Source branch: `test/lr-1b-operational-acceptance`

## Purpose

This document is the execution ledger for the pre-launch HestivaOS full operational acceptance run defined by `docs/ROADMAP.md` LR-1B. It records only verified acceptance evidence, blockers and rerun state. It does not replace the Browser Audit, API/source tests, mandatory PR quality gates or the final launch-baseline reset.

The current deployed OS is still pre-launch and contains disposable test/operational residue. That residue is intentionally retained during LR-1B. The launch-baseline reset is reserved for the end of the coordinated acceptance run, after affected defects are fixed and rerun, so the final reset proves the OS can return to a clean first-day-of-business state.

## Safety rules

- Exercise real application/API boundaries; do not mark direct database edits as operational acceptance.
- Do not use real customers as test recipients.
- Provider-side email, WhatsApp and Messenger actions must remain suppressed, sandboxed or separately approved because the launch reset cannot reverse them.
- The launch-baseline reset remains disabled during ordinary acceptance execution.
- Any failure becomes a focused defect lane and the affected scenario must be rerun after the fix.
- Do not claim role coverage without a usable identity for that role.

## Verified starting state

Production deployment at the start of this ledger includes the merged public Data API hardening from PR #272. Post-deployment inspection verified that `anon` and `authenticated` have zero public business tables with DML privileges and the Supabase security advisor no longer reports the prior public-table/RLS exposure.

Current application-role inventory, verified read-only from production on 2026-09-02:

- ADMIN: 2 ACTIVE users.
- SUPERVISOR: 0 ACTIVE users.
- TECHNICIAN: 0 ACTIVE users; 1 Technician user exists but is INACTIVE.

This means the ADMIN acceptance path can proceed, but the Supervisor, Technician and cross-role negative-authorization matrix cannot yet be declared executable or passed.

Current durable operational residue at LR-1B start includes existing Customers, Properties, Quotes, Work Orders, Messaging records and one Website enquiry. That state is intentionally not reset before the acceptance run.

## Execution matrix

| ID | Scenario | Current state | Evidence / blocker |
| --- | --- | --- | --- |
| A1 | ADMIN valid sign-in and protected-route access | BASELINE EVIDENCE EXISTS | Production-safe Browser Audit already signs in through the real UI with the dedicated ADMIN identity and traverses authenticated routes. LR-1B mutation evidence still pending. |
| A2 | SUPERVISOR sign-in, navigation and allowed actions | BLOCKED | No ACTIVE SUPERVISOR application user currently exists. |
| A3 | TECHNICIAN sign-in and assigned-job access | BLOCKED | No ACTIVE TECHNICIAN application user currently exists. Existing Technician user is INACTIVE. |
| A4 | Inactive/unauthorized access denial | PARTIAL / PENDING | API/browser foundations exist; full role matrix requires usable acceptance identities. |
| C1 | Customer create, reload, edit, validation | PENDING | Valid mutation intentionally excluded from production-safe Browser Audit. |
| C2 | Property create/associate/reload/edit | PENDING | Valid mutation intentionally excluded from production-safe Browser Audit. |
| Q1 | Quote intake/review/revision | PENDING | Requires controlled acceptance fixture. |
| Q2 | Quote acceptance and operational handoff | PENDING | Requires controlled acceptance fixture and no accidental outbound delivery. |
| W1 | Direct Work Order create with service/add-ons | PENDING | Read/reference/invalid-save Browser Audit coverage exists; valid create pending. |
| W2 | Staffing/scheduling/lifecycle | PENDING | Requires active operational identities/fixtures. |
| S1 | Crew and Shift create/edit/copy/delete where supported | PENDING | Read/non-saving editor coverage exists; valid mutation pending. |
| T1 | Technician Start Job/checklist/exceptions/offline/evidence/completion | BLOCKED | Requires ACTIVE TECHNICIAN identity plus assigned disposable Work Order fixture. |
| O1 | Supervisor operational review/correction/incident/interruption/replacement | BLOCKED | Requires ACTIVE SUPERVISOR identity and Technician-created execution state. |
| R1 | Recurring service create/pause/resume/cancel/generate | PENDING | Read/reference coverage exists; valid mutation pending. |
| M1 | Employee/service/template/scope/Admin mutations | PENDING | Read/invalid-save coverage exists; valid mutation pending. |
| P1 | Profile/account supported mutations | PENDING | Read/invalid native-submit coverage exists; valid password/email-change behavior pending controlled execution. |
| X1 | Correspondence materialization without real customer delivery | PENDING | Must remain provider-safe. |
| X2 | Messaging/Quote controlled boundary | PENDING | Must preserve Issue #116/provider guardrails; PR #214 remains a separate open lane. |
| N1 | Negative authorization matrix by role | BLOCKED | Requires ACTIVE SUPERVISOR and TECHNICIAN acceptance identities. |
| I1 | Refresh/reload/idempotency/replay | PENDING | Execute alongside each applicable mutation scenario. |
| F1 | Failure/retry/recovery | PENDING | Execute against bounded operational scenarios as fixtures exist. |
| D1 | Desktop launch-critical ADMIN/SUPERVISOR paths | PARTIAL | Broad production-safe desktop readiness exists; mutation acceptance pending. |
| D2 | Phone Technician launch-critical path | BLOCKED | Requires ACTIVE TECHNICIAN identity and assigned fixture. |
| Z1 | Final launch-baseline reset and residue proof | DEFERRED | Intentionally executed only after LR-1B mutation scenarios and defect reruns are complete. |

## First blocker — role readiness

LR-1B cannot truthfully complete Scenario 1, Technician execution, Supervisor operations or negative authorization while production lacks active SUPERVISOR and TECHNICIAN application identities.

Do not resolve this by changing `public.users` directly. Identity/access changes must use the canonical Admin/Supabase invitation and application-access flow so the acceptance run also proves the supported user-access boundary. If creating or reactivating acceptance identities causes email/provider side effects, use deliberately controlled internal acceptance addresses and document the external effect.

## Browser-automation boundary

`docs/OS_BROWSER_AUDIT_V1.md` remains deliberately non-mutating and the current `.github/workflows/os-browser-audit.yml` has only the ADMIN browser-audit credential. Therefore its existing workflow cannot be relabeled as LR-1B mutation proof.

The acceptance programme may extend the same Playwright architecture with a separately guarded mutation project, but only after the role/recipient fixture boundary is explicit. It must not weaken the existing production-safe browser project's mutation guard.

## Completion rule

LR-1B is complete only when every launch-required scenario is PASS or explicitly removed from launch scope by a separately documented decision, all discovered defects are fixed through normal focused PRs and rerun, and the final launch-baseline reset proves disposable rows/private operational Storage are removed while canonical configuration and authorized launch identities remain operational.
