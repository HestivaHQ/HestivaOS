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

### Required identity/provisioning sequence

The normal product lifecycle requires a HestivaOS `User` to exist before ADMIN can assign its application role. Therefore LR-1B must execute identity readiness in this order:

1. ADMIN signs in through the normal login UI and saves only the ADMIN browser session state.
2. Each controlled workforce identity performs a bootstrap sign-in through the normal login UI so Supabase authentication and HestivaOS `/users/sync` create/reconcile the application user where needed. These bootstrap sessions are discarded and are not role-interface acceptance evidence.
3. ADMIN opens the real `/admin/settings/user-access` interface, searches each controlled workforce user, assigns the intended `SUPERVISOR`/`TECHNICIAN` application role where needed and ensures OS access is ACTIVE. No direct database or privileged test-only mutation is allowed.
4. Supervisor and both Technician identities then sign in again with their own credentials in fresh browser contexts. Only these post-provisioning sessions are stored for role-specific acceptance projects.
5. The setup is serial/fail-closed: if ADMIN authentication, identity bootstrap or ADMIN provisioning fails, downstream role-interface scenarios do not run.

This ordering prevents a default/bootstrap role from being mistaken for the intended acceptance role and makes A2 a real Admin UI operation rather than a test precondition hidden outside HestivaOS.

## Role-interface acceptance requirement

Creating the role records is not sufficient. Every acceptance identity must prove the **actual user experience for that role** through a real authenticated browser session.

### ADMIN interface

The selected ADMIN acceptance account must sign in through the normal login UI and exercise the complete launch-critical office/admin surface appropriate to ADMIN. This includes role-visible navigation, Customers, Properties, Quotes, Work Orders, workforce/crew/shift planning, recurring services, service/template/scope administration, Admin settings, profile/account behavior, and all supported launch-facing mutation paths covered elsewhere in this ledger.

### SUPERVISOR interface

The disposable SUPERVISOR must independently sign in through the normal login UI using its own credentials. Acceptance must verify:

- the Supervisor lands in and can navigate the interface actually intended for SUPERVISOR rather than inheriting ADMIN-only presentation;
- every launch-critical Supervisor-visible route opens without browser exceptions or 5xx responses;
- Supervisor operational review, corrections, incidents, interruption/replacement handling and other supported Supervisor mutations work through the real UI;
- refresh/reload preserves authoritative state;
- controls/routes that are ADMIN-only or TECHNICIAN-only are hidden where appropriate and denied authoritatively if addressed directly;
- desktop behavior is tested comprehensively, and phone/mobile behavior is tested wherever the launch product intends Supervisor phone usage.

### TECHNICIAN interfaces

Each disposable TECHNICIAN must independently sign in through the normal login UI using its own credentials and enter the Technician experience intended for field work. At least two accounts are required so acceptance can distinguish Job Leader and non-leader authority.

For each Technician identity, acceptance must verify:

- login, session persistence and role-correct landing/navigation;
- only assigned/authorized job information is visible;
- job detail, Start Job, checklist/execution scope, exception/additional-work paths and evidence controls render and behave correctly;
- offline/local-first queueing, reload/reconciliation and private evidence persistence work on the phone-sized interface;
- the designated Job Leader can complete the Work Order when requirements are satisfied;
- the assigned non-leader cannot perform Job Leader-only completion;
- unassigned/forbidden Work Orders and office/Admin/Supervisor-only operations are denied;
- logout/re-login and refresh do not broaden access or lose acknowledged state.

The Technician path is primarily a phone/mobile acceptance target. Desktop may also be checked for defensive responsiveness, but desktop rendering alone cannot substitute for the phone execution test.

### Cross-role interface proof

For important boundaries, acceptance must test both sides: the role that **should** be able to act must succeed through its interface, and a role that **should not** be able to act must be denied. UI hiding alone is not authorization evidence; direct protected-route/API denial must also be observed where practical without exposing secrets or destructive side effects.

No role interface is considered accepted merely because authentication succeeds or the landing page renders. Its meaningful launch workflows, state transitions, refresh behavior and authorization boundaries must be exercised.

## Verified starting state

Production deployment at the start of this ledger includes the merged public Data API hardening from PR #272. Post-deployment inspection verified that `anon` and `authenticated` have zero public business tables with DML privileges and the Supabase security advisor no longer reports the prior public-table/RLS exposure.

Application-role inventory at the start of the ledger, verified read-only from production on 2026-09-02, was:

- ADMIN: 2 ACTIVE users.
- SUPERVISOR: 0 ACTIVE users.
- TECHNICIAN: 0 ACTIVE users; 1 Technician user existed but was INACTIVE.

That was the **starting** inventory, not the current acceptance state. The controlled Supervisor and two Technician identities were subsequently invited/accepted through the supported flow and synchronized by real sign-in. LR-1B run #7 on deployed main `edfa8f1e98a140e24ac201fa39702d3f231898e0` verified successful authentication for ADMIN, Supervisor and both Technician credentials. The Supervisor role-interface check then failed while navigating to `/work-orders`, exposing that the harness had authenticated role sessions before ADMIN performed A2 role provisioning. No Supabase authentication failure remained in run #7.

Current durable operational residue at LR-1B start includes existing Customers, Properties, Quotes, Work Orders, Messaging records and one Website enquiry. That state is intentionally not reset before the acceptance run.

## Execution matrix

| ID | Scenario | Current state | Evidence / blocker |
| --- | --- | --- | --- |
| A1 | ADMIN valid sign-in and protected-route access | PASS FOUNDATION | LR-1B run #7 authenticated ADMIN successfully and opened the office interface. Broader mutation evidence remains part of later scenarios. |
| A2 | ADMIN invites acceptance workforce and assigns roles/access | READY FOR RERUN | Controlled identities already exist from the supported invitation/acceptance flow. The harness now must bootstrap/sync them, then use the real ADMIN User Access UI to set intended roles/access before role sessions are stored. |
| A3 | SUPERVISOR real login and role-specific interface | READY AFTER A2 | Run #7 proved credentials/authentication, but the pre-provisioning Supervisor session was not valid role-interface evidence and `/work-orders` navigation aborted. Rerun only after A2 completes in-sequence. |
| A4 | TECHNICIAN #1 real login and role-specific phone interface | READY AFTER A2 | Run #7 proved credentials/authentication. Fresh post-provisioning Technician session is required before operational acceptance evidence is counted. |
| A5 | TECHNICIAN #2 real login and role-specific phone interface | READY AFTER A2 | Run #7 proved credentials/authentication. Fresh post-provisioning Technician session is required before operational acceptance evidence is counted. |
| A6 | Inactive/unauthorized access denial | PARTIAL / PENDING | API/browser foundations exist; full role matrix follows post-A2 role sessions. |
| C1 | Customer create, reload, edit, validation | PENDING | Valid mutation intentionally excluded from production-safe Browser Audit. |
| C2 | Property create/associate/reload/edit | PENDING | Valid mutation intentionally excluded from production-safe Browser Audit. |
| Q1 | Quote intake/review/revision | PENDING | Requires controlled acceptance fixture. |
| Q2 | Quote acceptance and operational handoff | PENDING | Requires controlled acceptance fixture and no accidental outbound delivery. |
| W1 | Direct Work Order create with service/add-ons | PENDING | Read/reference/invalid-save Browser Audit coverage exists; valid create pending. |
| W2 | Staffing/scheduling/lifecycle | PENDING | Execute with acceptance workforce. |
| S1 | Technician/Employee records and skills/status mutations | PENDING | Use supported Admin UI/API only. |
| S2 | Crew create/edit/leadership/member persistence | PENDING | Must prove Job Leader and non-leader distinctions. |
| S3 | Shift create/edit/copy/delete where supported | PENDING | Exercise crew/technician/Work Order selectors and reload persistence. |
| T1 | Technician assigned-job visibility and Start Job | PENDING | Requires post-A2 Technician sessions and disposable assigned Work Order. |
| T2 | Checklist outcomes and field exception/additional-work paths | PENDING | Run through Technician phone interface. |
| T3 | Offline queue/reconciliation and refresh/reload behavior | PENDING | Must prove local-first boundaries without corrupting authoritative state. |
| T4 | Photo/evidence capture, persistence, private reload | PENDING | Use only disposable acceptance evidence. |
| T5 | Job Leader completion and non-leader denial | PENDING | Requires both Technician users signed into their own post-A2 sessions. |
| O1 | Supervisor operational review and correction | PENDING | Must run through Supervisor's own post-A2 authenticated interface using Technician-created execution state. |
| O2 | Incident/interruption/replacement-visit paths | PENDING | Exercise bounded launch-supported variants through Supervisor/ADMIN interfaces as contract requires. |
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
| N1 | Negative authorization matrix by role | PENDING | ADMIN/SUPERVISOR/TECHNICIAN allow/deny checks after A2. |
| I1 | Refresh/reload/idempotency/replay | PENDING | Execute alongside every applicable mutation scenario rather than as one isolated check. |
| F1 | Validation/failure/retry/recovery | PENDING | Exercise important operational boundaries with bounded failures and recoveries. |
| D1 | Desktop launch-critical ADMIN paths | PARTIAL | Broad production-safe desktop readiness exists; mutation acceptance pending. |
| D2 | Desktop launch-critical SUPERVISOR interface | READY AFTER A2 | Comprehensive own-session Supervisor UI/workflow acceptance follows successful ADMIN provisioning. |
| D3 | Phone launch-critical SUPERVISOR paths where product supports them | READY AFTER A2 | Verify real responsive/mobile Supervisor experience only for intended launch operations. |
| D4 | Phone TECHNICIAN #1 interface | READY AFTER A2 | Full Job Leader field workflow in a fresh post-provisioning session. |
| D5 | Phone TECHNICIAN #2 interface | READY AFTER A2 | Full non-leader field workflow and denial checks in a fresh post-provisioning session. |
| Z1 | Launch-baseline preview against full acceptance residue | DEFERRED | Run only after all mutation scenarios/defect reruns are complete. |
| Z2 | Final launch-baseline reset and residue proof | DEFERRED | Must remove disposable acceptance rows/private operational Storage while preserving canonical configuration/authorized launch identities. |
| Z3 | Post-reset clean smoke journey | DEFERRED | Prove preserved configuration can create the first clean Customer → Quote/Work Order after reset, then remove that final smoke fixture if required by launch baseline policy. |

## Coverage expectation

The acceptance run should traverse the OS as one connected business operating cycle rather than isolated page clicks. The preferred backbone is:

1. ADMIN signs in; controlled workforce identities bootstrap/synchronize through real login; ADMIN then assigns/validates intended roles and ACTIVE access through User Access.
2. SUPERVISOR and both TECHNICIAN users complete fresh real login through their own credentials and role-specific interfaces after A2.
3. ADMIN creates or updates a disposable Employee/Technician setup, Crew and Shift structure.
4. ADMIN creates a disposable Customer and Property.
5. ADMIN exercises Quote creation/intake, review, revision and accepted handoff.
6. ADMIN also exercises direct Work Order creation so both operational entry paths are proven.
7. Work Orders are staffed/scheduled against the acceptance workforce.
8. Both TECHNICIAN users execute assigned work through their own phone-sized sessions, including Job Leader/non-leader distinctions, checklist, exceptions, offline/reload and private evidence.
9. SUPERVISOR signs into its own interface, reviews authoritative execution state and exercises corrections/incidents/interruption/replacement behavior.
10. ADMIN exercises recurring service, service/template/scope, Business Lists, profile/account and other launch-facing management paths.
11. Correspondence/provider-neutral Messaging boundaries are inspected without external delivery or Meta interaction.
12. Cross-role negative authorization is deliberately tested throughout, not only at the end.
13. The run finishes with launch-baseline preview, reset, residue proof and a clean post-reset smoke journey.

A page is not considered accepted merely because it rendered. For mutation-capable launch surfaces, acceptance should prove create/update/reload behavior, relevant validation/authorization, and downstream effects where the product contract defines them.

## Browser-automation boundary

`docs/OS_BROWSER_AUDIT_V1.md` remains deliberately non-mutating and the current `.github/workflows/os-browser-audit.yml` has only the ADMIN browser-audit credential. Therefore its existing workflow cannot be relabeled as LR-1B mutation proof.

The LR-1B acceptance programme should extend the same Playwright architecture with a **separate mutation project/workflow** rather than weakening the production-safe audit. The mutation workflow must:

- require an explicit acceptance-enable switch/input;
- use dedicated secrets for the ADMIN operator and controlled SUPERVISOR/TECHNICIAN acceptance identities;
- sequence ADMIN authentication, workforce bootstrap/sync, real ADMIN User Access role/access provisioning, then fresh role-specific authentication before role-interface projects;
- create separate authenticated browser storage/session state for ADMIN, SUPERVISOR, TECHNICIAN #1 and TECHNICIAN #2 rather than reusing ADMIN state across roles;
- explicitly validate the signed-in role before executing that role's project;
- execute role-specific projects against their intended desktop/mobile device profiles;
- fail closed if required identities or side-effect suppression conditions are missing;
- never run on ordinary pull-request events;
- never invoke Meta provider actions;
- keep logs/artifacts sanitized and avoid screenshots/traces where they could capture customer or credential data unless a later safe redaction design is approved;
- produce a compact scenario-result ledger/artifact that can be reconciled into this document without storing secrets or sensitive payloads.

## Completion rule

LR-1B is complete only when every launch-required scenario is PASS or explicitly removed from launch scope by a separately documented decision, all discovered defects are fixed through normal focused PRs and rerun, and the final launch-baseline reset proves disposable rows/private operational Storage are removed while canonical configuration and authorized launch identities remain operational.
