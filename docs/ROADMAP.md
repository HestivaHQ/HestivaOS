# Technical roadmap

This roadmap records only verified current planned work. Historical implementation detail remains in ADRs, `docs/CHANGELOG.md`, `docs/TECHNICAL_WORK_LOG.md`, focused contract documents and merged PR history.

The canonical reconciliation checkpoint for the earlier backlog is `docs/CANONICAL_BACKLOG_FREEZE_2026-08-20.md`. Before starting any slice, verify the specific gap against current `main`; do not reopen a completed foundation because an older issue body, historical roadmap paragraph or sub-slice document still describes it as future work.

## Current state — launch-readiness focus, 2026-09-02

The major HestivaOS operational foundations are implemented. Current work is no longer a generic feature-building backlog: the priority is to prove the complete operating system, close launch-facing usability gaps, harden production operations, and then perform final reconciliation.

Important verified foundations include:

- Website → HestivaOS structured Quote and contact-enquiry ingestion with integration authentication and idempotency.
- Customer/Property Quote review and accepted-Quote operational handoff.
- Work Order creation, staffing, lifecycle, controlled material changes, interruption/replacement handling and Supervisor Operational Review.
- Homent Technician assignment-scoped PWA with Start Job, frozen Execution Scope, compressed checklist, offline Execution Evidence and Complete Job.
- Dashboard Needs Attention, access readiness/recovery and private Execution Evidence controls.
- Admin service/template management, recurring-service lifecycle and administrative access/audit controls.
- Provider-neutral and direct Meta WhatsApp/Messenger foundations, deterministic Messaging Quote collection and provider-secured inbound media.
- Customer Correspondence template/version, rendering/provenance and provider-neutral delivery-attempt foundations.
- Repository development and authoritative CI under the ADR-0067 three-stage workflow.
- Production-safe Browser Audit coverage across the broad Admin/office surface on desktop and mobile, including real sign-in, route readiness, bounded non-mutating interactions, browser exceptions and HTTP/server failure detection.
- Next.js dependency security remediation and the returning-user login sync fast path.

The Next.js `middleware.ts` → `proxy.ts` migration was investigated on 2026-09-02 and is currently **BLOCKED**, not an active implementation item. Next.js 16 Proxy requires the Node.js runtime while the current OpenNext Cloudflare deployment path does not support that runtime boundary. HestivaOS therefore deliberately retains the proven `middleware.ts` path until the deployment stack supports the migration. Do not retry the rename without first re-verifying OpenNext/Cloudflare compatibility.

Broad customer-facing Messenger automation, out-of-window Messenger messaging, broad live customer correspondence delivery and Finance runtime are not implied by the completed foundations. WhatsApp and Messenger production activation still require the applicable Meta assets/configuration and provider onboarding outside the repository.

## Execution strategy

Use one focused implementation lane at a time for schema-heavy, authentication/security, shared-domain or launch-acceptance work. Parallel lanes are appropriate only when current-main and active-PR inspection prove they do not compete for migrations, Prisma models, ADR/global identifiers, shared API contracts or the same canonical history/current-state documents.

For each implementation slice, use the three-stage workflow in `AGENTS.md` and ADR-0067: proportional fast-loop checks while the branch is fluid; final documentation/current-main/complete-diff reconciliation once implementation stabilizes; then one frozen exact head through all required GitHub jobs and strict pre-merge review. Do not use chat memory as backlog authority.

## Launch sequence — current execution order

The following sequence is the current launch-readiness priority. Later product expansion remains recorded below but must not distract from proving and hardening the existing OS.

### LR-1A — Launch-baseline reset and acceptance-test safety

**Priority: immediate prerequisite to exhaustive mutation testing.**

The existing ADMIN Customer Data Cleanup remains useful for deleting one selected Customer-owned operational file, but it is not the canonical whole-OS test reset. It currently does not remove every launch-domain record, intentionally preserves shared Shifts by detaching them, and does not delete Storage objects represented by deleted Work Order photo rows. It therefore must not be treated as proof that an exhaustive acceptance run leaves no residue.

Add a separate, explicit **Reset OS to Launch Baseline** capability. This is not a raw database wipe. Its contract is to return the deployed OS to the same clean operational state expected immediately before first real business use while preserving the system itself.

The reset design must explicitly classify every durable record family as one of:

- **RESET:** disposable operational/test state that must be removed for a clean launch;
- **PRESERVE:** canonical system/business configuration required after reset;
- **EXTERNAL / NON-REVERSIBLE:** provider-side effects that cannot be undone and therefore must be prevented, sandboxed or separately controlled during ordinary acceptance runs.

The launch-baseline reset must remove or reconcile all acceptance-owned operational state, including where applicable:

- Customers, Contacts, Properties and disposable customer identity/linkage state;
- Quotes, revisions, line items, photos, activities, customer capabilities and accepted operational links;
- Work Orders and their assignments, activities, checklist/execution state, execution-scope revisions, evidence, incidents, completion corrections, access-readiness state, temporary credentials and access-recovery state;
- recurring-service agreements and test-generated visits;
- test-created Shifts/Crew planning state where the records themselves belong to the acceptance run rather than merely detaching Work Orders;
- disposable Correspondence render/delivery-attempt/provider-event state created by the acceptance run;
- disposable Messaging Quote/linkage state and provider-neutral test records that are safe to remove;
- database metadata and actual private Storage objects owned by disposable Quote/Work Order evidence, with a verified orphan check after reset;
- any other launch-domain records created by the final LR-1 scenario matrix.

The reset must preserve at minimum:

- Prisma migration history and schema state;
- Business Profile and approved launch business settings unless a specific field is explicitly classified as disposable;
- canonical Service Catalogue, Business Lists, published Service Scope Templates and Cleaning Job Templates required for launch;
- required application roles, authorized launch Users and approved employee/technician identities unless an identity is explicitly marked as disposable acceptance identity;
- security configuration, authorization policy, environment/provider configuration and repository/deployment state;
- immutable security/audit evidence whose deletion would undermine the system's audit model, unless a separately approved test-only audit partition makes removal safe;
- canonical system configuration required for the first real Customer/Quote/Work Order.

Safety requirements:

- ADMIN-only with an explicit launch-reset permission boundary;
- preview/dry-run that reports exact record/object counts by domain before mutation;
- destructive confirmation materially stronger than typing one Customer name;
- transactional database deletion/reconciliation wherever possible;
- ordered handling of restricted foreign keys and immutable-history boundaries instead of bypassing constraints;
- explicit Storage deletion and post-delete verification rather than silently orphaning files;
- external-provider guardrails so reset never pretends to unsend an email, WhatsApp message or Messenger message;
- post-reset verification that no disposable acceptance-owned operational rows or Storage objects remain;
- post-reset smoke check proving preserved configuration still supports a new clean Customer → Quote/Work Order journey;
- recovery/runbook documentation for failed or partially completed reset operations.

The final pre-launch use of this capability must produce a verified **launch baseline**: no test Customers, Quotes, Work Orders, Shifts, recurring agreements, disposable messaging/correspondence records, test evidence or orphaned test Storage objects remain, while all canonical launch configuration and authorized identities remain intact.

### LR-1B — Full Operational Acceptance Test

The production-safe Browser Audit proves broad route/read/UI operativeness but intentionally does not prove the complete mutation lifecycle. After LR-1A establishes a genuinely disposable and verifiable acceptance boundary, HestivaOS must run a coordinated full operational acceptance test.

Build and execute a documented scenario matrix covering at least:

1. authentication and role access for ADMIN, SUPERVISOR and TECHNICIAN;
2. Customer creation/editing and Property creation/association/editing;
3. Quote intake/review/revision/acceptance and accepted-Quote handoff;
4. direct Work Order creation, service/add-on selection, staffing and scheduling;
5. Crew and Shift Planning create/edit/copy/delete behavior where supported;
6. Technician phone workflow: assigned job → Start Job → checklist → exception/additional-work paths → offline queue/reconciliation → photo/evidence persistence → Job Leader completion;
7. Supervisor/Admin operational review, correction, incident/interruption and replacement-visit paths;
8. recurring-service create/pause/resume/cancel/generation behavior;
9. Employee, service, Cleaning Job Template, Service Scope and Admin-management mutations that are intended for launch;
10. Profile/account mutations, including password changes and confirmed-email behavior;
11. Customer Correspondence materialization/delivery boundaries without accidentally contacting real customers;
12. Messaging/Quote boundaries with external provider side effects disabled, sandboxed or deliberately controlled;
13. negative authorization checks so each role is denied operations it must not perform;
14. refresh/reload/idempotency/replay checks at critical mutation boundaries;
15. failure/retry/recovery paths at important operational boundaries;
16. desktop and phone execution for the launch-critical paths appropriate to each role;
17. launch-baseline reset after the run, followed by proof that disposable test data and Storage objects are gone and canonical configuration remains operational.

A launch-readiness acceptance run is complete only when failures are captured as defects, fixed through normal focused PRs, and the affected scenarios are rerun. Passing source tests or route-open checks alone must not be recorded as full OS operativeness.

After LR-1B is clean, perform a final launch-baseline reset before real operations begin.

### LR-2 — Complete authentication experience

Make authentication customer/staff-facing as Homent/HestivaOS rather than exposing generic provider presentation while retaining Supabase as the underlying identity provider and preserving HestivaOS role/status authority.

Required scope:

- Homent/HestivaOS-styled confirmation and invitation email presentation where Supabase Auth currently sends provider-default mail;
- branded confirmation/recovery landing behavior;
- Forgot password entry from the login screen;
- secure reset-email request flow;
- HestivaOS reset-password screen and successful return-to-login/session behavior;
- expired, invalid, reused and otherwise unusable recovery-link handling;
- browser/API regression coverage for confirmation, recovery and authorization boundaries;
- no weakening of canonical `User.role` / `User.status`, provider UUID binding, email-change reconciliation or session revocation controls.

### LR-3 — Actionable production alerting

Establish an actual notification path for production failures rather than health endpoints that require manual observation.

Cover:

- Worker/API liveness and readiness;
- Supabase/database dependency failure;
- repeated/transient-failure thresholds that avoid noisy single-event alerts;
- actionable context and incident/runbook links without exposing credentials or customer data;
- recovery/clear-state behavior so an operator can distinguish an active incident from a resolved one.

### LR-4 — Phone web-app programme

Plan and implement the phone experience as an extension of the existing Homent Technician PWA rather than creating disconnected mobile products by default.

Architecture planning must decide and document:

- whether the preferred model remains one installable role-aware Homent OS PWA with specialized ADMIN, SUPERVISOR and TECHNICIAN experiences, or whether evidence requires separate installable applications;
- mobile navigation and role-visible information architecture;
- which Admin/Supervisor operations genuinely belong on a phone and which remain desktop-only;
- offline requirements by role;
- background synchronization and conflict/retry behavior;
- push/notification requirements and their relationship to Needs Attention;
- camera/photo/file workflows and private evidence handling;
- installability, manifest, icons, splash/launch presentation and update behavior;
- mobile session/authentication/recovery behavior;
- responsive and real-device acceptance coverage.

Implementation must be split into bounded role/workflow slices after the architecture is approved. Do not turn the desktop OS into a cramped phone UI merely to claim mobile support.

### LR-5 — Operational infrastructure hardening

After or safely in parallel with the preceding non-colliding slices:

1. verify Cloudflare native Git is the only active web deployment controller;
2. automate and regularly test database and critical Storage backup/restore procedures;
3. migrate the Railway API away from the legacy `mmapi` hostname with coordinated API variables, CORS, rebuild and verification;
4. remove rollback-only Railway web infrastructure only after rollback procedures are proven;
5. clean up account identity/ownership across GitHub, Cloudflare, Railway and Supabase;
6. design safe orphaned Storage-object reconciliation where database metadata deletion does not delete objects;
7. replace provisional operational costing inputs such as COIDA with authoritative assessed values when available;
8. expand integration, authentication, storage, migration and deployment smoke coverage;
9. mature monitoring with actionable thresholds and incident-runbook links;
10. periodically test recovery and audit deployment-controller ownership.

### LR-6 — Final launch reconciliation

Before declaring HestivaOS launch-complete:

- rerun the full operational acceptance matrix on the launch candidate;
- run the launch-baseline reset and verify a clean operational slate;
- run a repository-wide authorization/permission audit;
- audit lifecycle/state-machine and idempotency consistency;
- run clean and staged PostgreSQL migration replay;
- run privacy/security review of evidence, access credentials, messaging and customer data;
- exercise backup/restore and documented recovery procedures;
- verify Website ↔ HestivaOS contracts against both repositories;
- verify WhatsApp/Messenger ↔ HestivaOS contracts and live provider behavior appropriate to the launch state;
- verify desktop and phone launch-critical workflows on representative devices;
- reconcile permanent documentation against runtime one final time;
- close or supersede coordination issues only when their genuine remaining work is complete.

## Product expansion after launch-readiness blockers

These remain legitimate planned product areas, but they are not allowed to obscure the launch-readiness sequence above.

### Customer duplicate resolution / merge reversal / archival

Product-decision-blocked until exact merge authority, reversal semantics, history retention and archival behavior are approved. Do not implement destructive merge behavior speculatively.

### Live WhatsApp + Facebook Messenger expansion

Continue from the merged provider-neutral messaging contracts, direct provider edges and deterministic Messaging Quote foundation.

- WhatsApp provider edge: IMPLEMENTED.
- Messenger provider edge: IMPLEMENTED for authenticated Page webhooks and guarded standard-window text replies.
- Provider identity ↔ Customer linking: IMPLEMENTED with deliberate ADMIN-only linking and fail-closed reassignment behavior.
- Deterministic Messaging Quote foundation: IMPLEMENTED.
- WhatsApp Flow-first Quote intake: APPROVED / PLANNED under ADR-0088. HestivaOS remains the sole Quote/pricing/business authority; preserve versioned Flow/mapping semantics and explicit fallback **Flow → guided WhatsApp collector → Website where appropriate → human assistance**.
- Flow PhotoPicker: PLANNED / OPTIONAL and must preserve private-media/security/replay principles before becoming Quote-owned evidence.
- Add human takeover/operator handling.
- Select/integrate an AI provider only after deterministic/Flow paths are production-proven and keep the AI boundary replaceable.

Messaging coordination remains Issue #116. The Website integration remains a separate boundary and `HESTIVA_WEBSITE_INTEGRATION_SECRET` must not be reused for messaging.

### Needs Attention and notifications product expansion

- add snooze/delegation only as an extension of the existing Needs Attention lifecycle;
- add business-event notification delivery with explicit event/priority rules;
- add Finance, Correspondence and Messaging producers only after their authoritative runtime conditions exist;
- do not fabricate Worker Issue / Job Exception records before those models are approved and implemented.

This product-notification work is distinct from LR-3 production infrastructure alerting.

### Finance runtime

Existing financial policy and ADRs are the product authority; implementation must not redesign settled rules casually.

Implement in bounded slices:

1. obligations, deposits, balances and financial-clearance state;
2. incoming payment / POP reconciliation;
3. underpayment, partial payment, overpayment and manual allocation;
4. customer credit/unallocated funds and human-authorized refunds;
5. overdue/hold/collection/prepayment-restriction and restoration workflows;
6. recurring standing-advance and month-end billing runtime;
7. invoices, receipts and correspondence integration;
8. provider-specific collection automation only after provider/authority decisions are approved.

Still unresolved and not to be invented: payment/collection provider, weekend/public-holiday handling for month-end dates, and any future delegation beyond current launch authority.

## Backlog guardrail

Do not create future slices named only “Quote handoff”, “Technician app”, “Execution Scope”, “Complete Job”, “Access readiness”, “Supervisor workspace”, “Messaging persistence”, “Service Scope Admin editor”, “Incident workflow”, “Evidence security”, “Website enquiry ingestion”, “scalable selectors”, “recurring auto-resume”, “admin access audit history”, “Supabase Admin invitation/provider-session revocation”, “Supabase Auth email-change/confirmation UX”, “controlled fields”, “subordinate job types”, “Technician skills”, “Website JOB_TYPES mapping”, “Correspondence template/version ownership”, “rendered correspondence history/provenance”, “Correspondence delivery-attempt/retry/failure state”, “Correspondence human-approval boundary”, “Work Order completion correspondence materialization”, “accepted Quote booking correspondence materialization”, “controlled Work Order reschedule/cancellation correspondence materialization” or “WhatsApp webhook authentication foundation”. Those foundations are merged or explicitly closed by evidence review. Any future work in those areas must identify a specific verified residual requirement, defect or newly approved vocabulary/extension.
