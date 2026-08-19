# Canonical backlog freeze — 2026-08-19

This document is the current-state reconciliation checkpoint for HestivaOS after the merged operational, Technician, access, messaging-foundation, Admin/Operations, Website-enquiry and recurring-lifecycle work through PR #151.

It exists to prevent completed work from re-entering the backlog and to define the next dependency-ordered implementation phases from verified merged state. It is a current-state planning document, not a replacement for historical ADRs, changelogs, technical work logs or live cross-system coordination issues.

## Source-of-truth rule

For implementation state, current merged `main` wins over old roadmap text, old issue-body status paragraphs, historical sub-slice documents and earlier coordination comments. Historical documents remain valid records of what was true at the time they were written, but must not be used to reopen work that later merged.

Cross-system routing remains:

- Website ↔ HestivaOS: Issue #73.
- WhatsApp / Facebook Messenger ↔ HestivaOS: Issue #116.
- Current merged repository code, schema, tests, ADRs and permanent contract documents remain the implementation authority.

## Verified completed foundations — do not reopen as generic backlog items

The following areas have merged implementations and may only be revisited for a specific evidenced defect, residual gap or separately approved extension.

### Website Quote and accepted-Quote operations

- Authoritative Quote aggregate, immutable revisions, pricing snapshots/line items, Quote photo provenance/status and retry identities.
- Structured Website Quote contracts and guarded Website → HestivaOS ingestion.
- Dedicated Website integration authentication, replay/conflict handling, HestivaOS-owned pricing/profitability and OpenRouteService road-distance costing.
- Durable Customer/Property match-or-review and Admin resolution.
- Atomic ONE_TIME Quote acceptance into one linked Work Order.
- Atomic supported recurring Quote acceptance into one Recurring Service Agreement plus initial Work Order.
- Admin Quote queue/detail/preflight/resolution/accept/decline UI.
- Non-lossy accepted-Quote operational handoff including typed visit context, exact floor/building-access data, recurring context, quote-evidence linkage and visit-scoped temporary-credential boundary.
- Positive quantity persistence for operational add-ons, including Laundry/Ironing capacity controls.
- HestivaOS-owned Website contact-enquiry ingestion, immutable replay/conflict handling and authoritative `ENQ-YYYYMMDD-NNNN` references; the Website consumer cutover is merged and requires that HestivaOS acknowledgement before reporting success.

### Work Order staffing and field execution

- Zero/one/many Technician assignment model and Admin assignment mutation.
- Crew prepopulation, Crew Leader and Work Order Job Leader snapshots.
- Assignment-scoped Homent Technician PWA foundation.
- Leader-only idempotent Start Job.
- Versioned Service Scope Templates and immutable frozen Work Order Execution Scope revisions.
- Compressed section checklist/outcome model with offline reconciliation.
- Local-first Execution Evidence capture, upload/retry and server acknowledgement.
- Leader-only offline-authoritative Complete Job and management acknowledgement.
- Controlled Work Order material-change workflow.
- Scope-mismatch/additional-work management resolution.
- Interrupted-visit workflow and linked replacement visits.
- Durable incident reporting/review with Needs Attention integration.
- Private Execution Evidence read hardening with short-lived signed access.
- Append-only, management-authorized post-completion Technician correction workflow.
- Work Order and Shift Planning relationship selectors use bounded/debounced server-backed search rather than fixed 100-record snapshots.

### Operations, access and management

- Dashboard Needs Attention foundation and initial authoritative producers.
- Visit-specific Work Order access-readiness state/history and Needs Attention integration.
- Protected visit-scoped temporary access credentials with Admin review/reveal/revoke boundary.
- Appointment-relative access escalation and safe Technician readiness projection.
- Human-triggered access recovery using persisted provider-neutral messaging conversations/messages.
- Supervisor Operational Review workspace.
- Admin Service Scope Template manager and pre-start Work Order scope revision comparison/adoption.
- Management gateway and canonical `/work-orders/new` direct-create route.
- Recurring-service lifecycle preserves generated Work Orders, surfaces already-created future visits for separate review, skips missed backlog on manual resume, and supports persisted Johannesburg automatic-resume dates through a database-guarded Railway API reconciler.

### Messaging foundation

- Provider-neutral WhatsApp/Messenger messaging contracts and adapter boundary.
- Provider-event idempotency and provider-scoped identity separation.
- Channel-neutral Quote-draft/human-review boundary.
- Durable provider-neutral conversation/message/status-event persistence introduced by the access-recovery slice.

The messaging foundation does **not** mean live Meta production connectivity is complete. No live WhatsApp Cloud API or Messenger provider adapter/webhook activation should be inferred from the persistence foundation.

## Verified remaining implementation backlog

The backlog below is dependency-ordered. Before implementing any item, current `main` must still be inspected to confirm that the specific gap remains.

### Phase 1 — remaining safe Admin/Operations gaps

The first three historical Phase 1 items are now complete: scalable selectors, Website enquiry ingestion/cutover, and recurring lifecycle review/automatic resume. Do not reopen them generically.

Proceed in the following order to minimize cross-cutting risk and shared-file churn:

1. **Administrative access audit history.** Add durable, append-only HestivaOS audit history for Admin role/status/access changes using the existing application User authority. Keep this slice provider-neutral and do not bundle Supabase invitation/session-revocation behavior into the same migration unless the current source proves a hard dependency.
2. **Supabase Admin invitation and provider-session revocation.** After the application-side audit boundary is durable, implement the separately reviewed provider-admin workflow with explicit security/recovery documentation and no service-role exposure to browser code.
3. **Supabase Auth email-change/confirmation UX.** Keep authenticated email read-only until the approved verified-change flow exists; preserve application-user identity and fail-closed reconciliation rules.
4. **Remaining evidence-backed controlled fields / subordinate job-type mappings.** Audit current forms and existing Service / Cleaning Job Template architecture first; implement only verified missing controlled vocabularies/search behavior and do not invent lists.
5. **Customer duplicate resolution / archival.** This is product-decision-blocked until exact merge authority, reversal semantics, history retention and archival behavior are approved. Do not implement destructive merge behavior speculatively.

Efficiency rule for Phase 1: keep each of items 1–4 as a focused PR unless source inspection proves they share one unavoidable transactional/security boundary. Item 5 remains blocked until product authority is explicit.

### Phase 2 — Customer Correspondence runtime

Build the HestivaOS-owned correspondence runtime before wiring broad automated customer messages:

1. durable template/version ownership;
2. rendered correspondence history and provenance;
3. delivery-attempt/retry/failure state;
4. explicit approval/authorization boundaries for messages that must remain human-controlled;
5. event-driven integration for already-approved booking, completion, reschedule/cancellation and related customer communication only after the runtime authority exists.

Provider transport must not own business decisions. Email, WhatsApp and Messenger should consume authoritative HestivaOS correspondence/business state rather than becoming independent sources of truth.

For efficiency, implement the correspondence domain/persistence and rendering/history boundary before adding provider-specific delivery. This gives Messaging and Finance a stable shared consumer contract and prevents duplicated outbound-history models.

### Phase 3 — live WhatsApp + Facebook Messenger connectivity

Continue from the merged provider-neutral contracts and persistence rather than creating a second messaging system:

1. verify current Meta API versions, permissions, onboarding assets, webhook verification/signature requirements and South African policy/pricing before freezing provider-specific behavior;
2. implement WhatsApp Cloud API webhook/adapter connectivity with verified authenticity, normalization, idempotent persistence and outbound delivery/status handling;
3. implement Messenger against the same shared conversation engine and persistence;
4. add deliberate provider-identity ↔ canonical Customer linking without fuzzy automatic merges;
5. add deterministic customer quote/service conversation flows that call HestivaOS authoritative Quote/pricing/business boundaries;
6. add human takeover/operator handling;
7. select/integrate an AI provider only after deterministic flows exist and keep the AI boundary replaceable.

Messaging coordination remains Issue #116. Do not reuse `HESTIVA_WEBSITE_INTEGRATION_SECRET` for messaging.

### Phase 4 — Needs Attention and active notification completion

1. add snooze/delegation only as an extension of the existing Needs Attention lifecycle;
2. add active notification delivery with explicit event/priority rules;
3. add Finance, Correspondence and Messaging producers only after their authoritative runtime conditions exist;
4. do not create parallel exception state or fabricate Worker Issue / Job Exception records before those models are approved and implemented.

### Phase 5 — Finance runtime

Finance is a major remaining domain. Existing policy/ADRs must be reused rather than redesigned. Implement in bounded reviewed slices:

1. financial obligations, deposits, balances and clearance state;
2. incoming payment / proof-of-payment reconciliation;
3. partial-payment, underpayment, overpayment and manual allocation workflows;
4. customer credit/unallocated-funds and human-authorized refund workflow;
5. holds, overdue/collection state, prepayment restrictions and rehabilitation/restoration;
6. standard recurring standing-advance behavior and month-end billing eligibility/cycles;
7. invoices, receipts and correspondence integration;
8. provider-specific collection automation only after a provider and exact authority rules are approved.

Known unresolved owner decisions must remain explicit, including payment/collection provider choice, weekend/public-holiday handling for month-end dates and any future delegation beyond current launch authority.

### Phase 6 — platform and production hardening

#### High priority

- Run the authoritative dependency-security diagnostic/remediation pass.
- Migrate deprecated Next.js `middleware.ts` convention to `proxy` with authentication/route-protection verification.
- Establish actionable alert delivery for Worker/API/liveness/readiness/Supabase dependency failures.

#### Operational hardening

- Verify Cloudflare native Git remains the only active web deployment controller after controller/account changes.
- Automate and regularly test database and critical Storage backup/restore procedures.
- Migrate the Railway API away from the legacy `mmapi` hostname with coordinated URL/CORS/environment verification.
- Remove rollback-only infrastructure only after rollback procedures are proven.
- Clean up account identity/ownership across GitHub, Cloudflare, Railway and Supabase.
- Design safe orphaned Storage-object reconciliation where database metadata deletion currently does not delete storage objects.
- Replace provisional operational costing inputs such as COIDA with authoritative assessed values when available.
- Expand integration/authentication/storage/migration/deployment smoke coverage and periodically exercise recovery.

### Phase 7 — final system reconciliation

Before declaring the OS launch-complete:

- run a repository-wide authorization/permission audit;
- audit lifecycle/state-machine consistency and idempotency boundaries;
- run clean and staged PostgreSQL migration replay;
- run privacy/security review of evidence, credentials, messaging and customer data;
- exercise backup/restore and documented recovery procedures;
- verify Website ↔ HestivaOS contracts against both repositories;
- verify WhatsApp/Messenger ↔ HestivaOS contracts and live provider behavior;
- reconcile permanent documentation against runtime one final time;
- close or supersede coordination issues only when their genuine remaining cross-system work is complete.

## Efficient execution lanes

Use one primary implementation lane at a time for schema-heavy or shared-domain work. Parallel lanes are appropriate only when current-main inspection proves they do not compete for schema/models, migrations, ADR numbers, shared API contracts or the same canonical history/current-state documents.

Recommended sequencing:

1. Finish Phase 1 application/admin security gaps.
2. Build the Correspondence domain before broad outbound messaging or Finance-generated documents.
3. Continue live Meta connectivity against the existing Messaging foundation; WhatsApp and Messenger provider adapters may be separate PRs once their shared provider contract is stable.
4. Extend Needs Attention/notifications only after each producer domain has authoritative runtime state.
5. Implement Finance in bounded dependency order, integrating invoices/receipts with the already-established Correspondence runtime.
6. Run platform-hardening items continuously where they are independent, but do not let a hardening PR collide with an active schema/security migration lane.
7. Perform final system reconciliation only after the runtime domains are complete.

This ordering reduces context switches, prevents duplicate correspondence/messaging/financial history models, and minimizes append-only/schema collision risk.

## Items intentionally not treated as remaining generic work

Do not create future slices named only “Quote handoff”, “Technician app”, “Execution Scope”, “Complete Job”, “Access readiness”, “Supervisor workspace”, “Messaging persistence”, “Service Scope Admin editor”, “Incident workflow”, “Evidence security”, “Website enquiry ingestion”, “scalable selectors” or “recurring auto-resume”. Those foundations are merged. A new slice in one of these areas must identify a specific verified residual requirement or defect.

## Workflow after this freeze

Every new slice uses the repository-default three-stage workflow in `AGENTS.md` and ADR-0067:

1. **Context/bootstrap:** read current `main`, `AGENTS.md`, the applicable current-state docs/ADRs and coordination issue; verify the proposed backlog gap still exists; inspect relevant active PRs and reserve global identifiers safely.
2. **Stage 1 — fast development loop:** create one focused branch/PR lane, implement only the verified gap, and run proportional high-signal checks for the affected area. Persist material architecture/security/business/cross-system decisions as soon as another lane could depend on them; do not repeatedly run unrelated full integration checks while the branch is fluid.
3. **Stage 2 — authoritative full PR CI:** once implementation stabilizes, reconcile every required document/coordination record, synchronize with current `main`, inspect the complete diff/history, freeze the exact head, and require all policy/security/diff, API, web/Cloudflare and PostgreSQL replay jobs to pass.
4. **Stage 3 — strict pre-merge review:** verify the exact tested head, current-main state, mergeability, parallel-PR collisions, append-only history and canonical documentation; merge one PR at a time only after maintainer approval and all required gates are green.
5. **Evidence-driven correction:** if a gate/review/security/integration finding fails, reopen the same scoped branch only for the smallest evidenced fix, run proportional affected-area checks, re-audit, freeze the new head and rerun the full authoritative CI.
6. After each merge, re-read current `main` before selecting the next slice.

This process optimizes repetition and sequencing without making chat memory authoritative or removing any final safeguard.
