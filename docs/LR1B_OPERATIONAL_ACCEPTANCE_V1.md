# LR-1B Operational Acceptance V1

Status: ACTIVE
Started: 2026-09-02
Source branch: `test/lr-1b-operational-acceptance`

## Purpose

This document is the execution ledger for the pre-launch HestivaOS full operational acceptance run defined by `docs/ROADMAP.md` LR-1B. It records only verified acceptance evidence, blockers and rerun state. It does not replace the Browser Audit, API/source tests, mandatory PR quality gates or the final launch-baseline reset.

The current deployed OS is still pre-launch and contains disposable test/operational residue. That residue is intentionally retained during LR-1B. The launch-baseline reset is reserved for the end of the coordinated acceptance run, after affected defects are fixed and rerun, so the final reset proves the OS can return to a clean first-day-of-business state.

LR-1B is intentionally a **whole-OS acceptance run** rather than a narrow smoke test. It should touch essentially every launch-facing HestivaOS operational surface through real application/API boundaries, using one existing active ADMIN as the primary office operator plus disposable SUPERVISOR and TECHNICIAN acceptance identities created through the supported Admin/Supabase access flow. The only explicit product-area exclusion is live Meta provider integration: the run must not exercise or mutate WhatsApp Cloud API, Facebook Messenger provider configuration, provider sends, templates, subscriptions, tokens, WABA/Page/App configuration or other Meta-side state.

Internal provider-neutral Messaging and Quote boundaries may be exercised only where they can be proven without triggering Meta traffic. Customer Correspondence may be materialized and inspected, but live external delivery is excluded unless separately approved with a controlled recipient.

## Safety rules

- Exercise real application/API boundaries; do not mark direct database edits as operational acceptance.
- Do not use real customers as test recipients.
- Live Meta integration is out of scope for LR-1B. Do not send WhatsApp/Messenger messages, change Meta configuration, invoke provider template operations, rotate tokens, change subscriptions or mutate provider assets.
- Provider-neutral internal Messaging state may be tested only when the path cannot escape to Meta.
- Customer Correspondence external delivery remains suppressed unless a separate controlled-provider smoke test is explicitly approved.
- Supabase invitation/confirmation email side effects for disposable acceptance identities are allowed only to deliberately controlled internal acceptance addresses because the launch reset cannot unsend them.
- The launch-baseline reset remains disabled during ordinary acceptance execution.
- Any failure becomes a focused defect lane and the affected scenario must be rerun after the fix.
- Do not claim role coverage without a usable identity for that role.
- The acceptance harness must never log passwords, tokens, capability values, provider payloads, customer-sensitive request/response bodies or browser storage state.

## Acceptance identity model

The intended LR-1B role topology is:

- **ADMIN operator:** one existing ACTIVE ADMIN account performs the office/admin side of the test and creates/manages acceptance workforce through the normal HestivaOS Admin access path.
- **SUPERVISOR acceptance user:** one disposable controlled account invited through `POST /users/admin/invitations`, synchronized through normal Supabase sign-in, assigned `SUPERVISOR` through the ADMIN-only role endpoint, and kept ACTIVE for Supervisor scenarios.
- **TECHNICIAN acceptance users:** at least two disposable controlled accounts invited/synchronized through the same supported path, assigned `TECHNICIAN`, linked to launch-test Technician/Employee records where the normal product workflow requires it, and used to prove Job Leader/non-leader, crew, shift, assignment and field authorization behavior.
- A third Technician may be added if a scenario genuinely needs additional crew/member separation, but the harness should not create identities merely for volume.

No acceptance user is created by inserting directly into `public.users` or `auth.users`. Creating the workforce is itself part of the acceptance evidence for Admin access management and Supabase identity reconciliation.

## Verified starting state

Production deployment at the start of this ledger includes the merged public Data API hardening from PR #272. Post-deployment inspection verified that `anon` and `authenticated` have zero public business tables with DML privileges and the Supabase security advisor no longer reports the prior public-table/RLS exposure.

Current application-role inventory, verified read-only from production on 2026-09-02:

- ADMIN: 2 ACTIVE users.
- SUPERVISOR: 0 ACTIVE users.
- TECHNICIAN: 0 ACTIVE users; 1 Technician user exists but is INACTIVE.

This means the ADMIN acceptance path can proceed immediately. The intended test will resolve Supervisor/Technician readiness through the real Admin invitation/role/access flow rather than direct database mutation.

Current durable operational residue at LR-1B start includes existing Customers, Properties, Quotes, Work Orders, Messaging records and one Website enquiry. That state is intentionally not reset before the acceptance run.

## Execution matrix

| ID | Scenario | Current state | Evidence / blocker |
| --- | --- | --- | --- |
| A1 | ADMIN valid sign-in and protected-route access | BASELINE EVIDENCE EXISTS | Production-safe Browser Audit already signs in through the real UI with the dedicated ADMIN identity and traverses authenticated routes. LR-1B mutation evidence still pending. |
| A2 | ADMIN invites acceptance workforce and assigns roles/access | READY | Must use canonical Admin invitation, synchronization, role and access flows; controlled internal addresses required. |
| A3 | SUPERVISOR sign-in, navigation and allowed actions | PENDING IDENTITY CREATION | To be executed after A2. |
| A4 | TECHNICIAN sign-in and assigned-job access | PENDING IDENTITY CREATION | To be executed after A2 with at least two Technician acceptance identities. |
| A5 | Inactive/unauthorized access denial | PARTIAL / PENDING | API/browser foundations exist; full role matrix follows acceptance identity creation. |
| C1 | Customer create, reload, edit, validation | PENDING | Valid mutation intentionally excluded from production-safe Browser Audit. |
| C2 | Property create/associate/reload/edit | PENDING | Valid mutation intentionally excluded from production-safe Browser Audit. |
| Q1 | Quote intake/review/revision | PENDING | Requires controlled acceptance fixture. |
| Q2 | Quote acceptance and operational handoff | PENDING | Requires controlled acceptance fixture and no accidental outbound delivery. |
| W1 | Direct Work Order create with service/add-ons | PENDING | Read/reference/invalid-save Browser Audit coverage exists; valid create pending. |
| W2 | Staffing/scheduling/lifecycle | PENDING | Execute with acceptance workforce. |
| S1 | Technician/Employee records and skills/status mutations | PENDING | Use supported Admin UI/API only. |
| S2 | Crew create/edit/leadership/member persistence | PENDING | Must prove Job Leader and non-leader distinctions. |
| S3 | Shift create/edit/copy/delete where supported | PENDING | Exercise crew/technician/Work Order selectors and reload persistence. |
| T1 | Technician assigned-job visibility and Start Job | PENDING IDENTITY CREATION | Requires ACTIVE Technician and disposable assigned Work Order. |
| T2 | Checklist outcomes and field exception/additional-work paths | PENDING | Run on Technician phone viewport. |
| T3 | Offline queue/reconciliation and refresh/reload behavior | PENDING | Must prove local-first boundaries without corrupting authoritative state. |
| T4 | Photo/evidence capture, persistence, private reload | PENDING | Use only disposable acceptance evidence. |
| T5 | Job Leader completion and non-leader denial | PENDING | Requires at least two Technician users. |
| O1 | Supervisor operational review and correction | PENDING IDENTITY CREATION | Requires Supervisor and Technician-created execution state. |
| O2 | Incident/interruption/replacement-visit paths | PENDING | Exercise bounded launch-supported variants. |
| R1 | Recurring service create/pause/resume/cancel/generate | PENDING | Read/reference coverage exists; valid mutation pending. |
| M1 | Employee and Business List mutations intended for launch | PENDING | Must preserve canonical controlled-input behavior. |
| M2 | Service Catalogue create/edit/status semantics | PENDING | Use disposable service only where safe; preserve canonical launch services. |
| M3 | Cleaning Job Template create/edit/service association/checklist | PENDING | Disposable acceptance template required. |
| M4 | Service Scope Template create/edit/version/publish behavior | PENDING | Exercise only supported launch mutations without damaging canonical templates. |
| M5 | Business Profile/Admin settings supported mutations | PENDING | Use reversible/disposable fields only; verify reload. |
| P1 | Profile personal-information mutation and reload | PENDING | Real signed-in role account. |
| P2 | Password-change flow | PENDING | Controlled acceptance identity so credentials can be updated safely. |
| P3 | Confirmed-email/email-change boundaries | PENDING | Exercise supported behavior without losing control of acceptance identities. |
| X1 | Correspondence materialization/render/history without delivery | PENDING | External delivery suppressed. |
| X2 | Provider-neutral internal Messaging/Quote state | PENDING | Must not invoke Meta provider edges; PR #214 remains separate future state until merged. |
| X3 | Meta WhatsApp/Messenger provider integration | EXCLUDED | Explicitly outside LR-1B. No provider sends/configuration/API smoke in this run. |
| N1 | Negative authorization matrix by role | PENDING IDENTITY CREATION | ADMIN/SUPERVISOR/TECHNICIAN allow/deny checks after A2. |
| I1 | Refresh/reload/idempotency/replay | PENDING | Execute alongside every applicable mutation scenario rather than as one isolated check. |
| F1 | Validation/failure/retry/recovery | PENDING | Exercise important operational boundaries with bounded failures and recoveries. |
| D1 | Desktop launch-critical ADMIN paths | PARTIAL | Broad production-safe desktop readiness exists; mutation acceptance pending. |
| D2 | Desktop launch-critical SUPERVISOR paths | PENDING IDENTITY CREATION | Execute after A2. |
| D3 | Phone Technician launch-critical path | PENDING IDENTITY CREATION | Execute after A2. |
| Z1 | Launch-baseline preview against full acceptance residue | DEFERRED | Run only after all mutation scenarios/defect reruns are complete. |
| Z2 | Final launch-baseline reset and residue proof | DEFERRED | Must remove disposable acceptance rows/private operational Storage while preserving canonical configuration/authorized launch identities. |
| Z3 | Post-reset clean smoke journey | DEFERRED | Prove preserved configuration can create the first clean Customer → Quote/Work Order after reset, then remove that final smoke fixture if required by launch baseline policy. |

## Coverage expectation

The acceptance run should traverse the OS as one connected business operating cycle rather than isolated page clicks. The preferred backbone is:

1. ADMIN signs in and creates/activates the acceptance workforce through supported Admin access management.
2. ADMIN creates or updates a disposable Employee/Technician setup, Crew and Shift structure.
3. ADMIN creates a disposable Customer and Property.
4. ADMIN exercises Quote creation/intake, review, revision and accepted handoff.
5. ADMIN also exercises direct Work Order creation so both operational entry paths are proven.
6. Work Orders are staffed/scheduled against the acceptance workforce.
7. TECHNICIAN users execute assigned work on phone-sized browser projects, including Job Leader/non-leader distinctions, checklist, exceptions, offline/reload and private evidence.
8. SUPERVISOR reviews authoritative execution state and exercises corrections/incidents/interruption/replacement behavior.
9. ADMIN exercises recurring service, service/template/scope, Business Lists, profile/account and other launch-facing management paths.
10. Correspondence/provider-neutral Messaging boundaries are inspected without external delivery or Meta interaction.
11. Cross-role negative authorization is deliberately tested throughout, not only at the end.
12. The run finishes with launch-baseline preview, reset, residue proof and a clean post-reset smoke journey.

A page is not considered accepted merely because it rendered. For mutation-capable launch surfaces, acceptance should prove create/update/reload behavior, relevant validation/authorization, and downstream effects where the product contract defines them.

## Browser-automation boundary

`docs/OS_BROWSER_AUDIT_V1.md` remains deliberately non-mutating and the current `.github/workflows/os-browser-audit.yml` has only the ADMIN browser-audit credential. Therefore its existing workflow cannot be relabeled as LR-1B mutation proof.

The LR-1B acceptance programme should extend the same Playwright architecture with a **separate mutation project/workflow** rather than weakening the production-safe audit. The mutation workflow must:

- require an explicit acceptance-enable switch/input;
- use dedicated secrets for the ADMIN operator and controlled SUPERVISOR/TECHNICIAN acceptance identities;
- fail closed if required identities or side-effect suppression conditions are missing;
- never run on ordinary pull-request events;
- never invoke Meta provider actions;
- keep logs/artifacts sanitized and avoid screenshots/traces where they could capture customer or credential data unless a later safe redaction design is approved;
- produce a compact scenario-result ledger/artifact that can be reconciled into this document without storing secrets or sensitive payloads.

## Completion rule

LR-1B is complete only when every launch-required scenario is PASS or explicitly removed from launch scope by a separately documented decision, all discovered defects are fixed through normal focused PRs and rerun, and the final launch-baseline reset proves disposable rows/private operational Storage are removed while canonical configuration and authorized launch identities remain operational.
