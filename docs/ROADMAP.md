# Technical roadmap

This roadmap records only verified current planned work. Historical implementation detail remains in ADRs, `docs/CHANGELOG.md`, `docs/TECHNICAL_WORK_LOG.md`, focused contract documents and merged PR history.

The canonical reconciliation checkpoint for the current backlog is `docs/CANONICAL_BACKLOG_FREEZE_2026-08-19.md`. Before starting any slice, verify the specific gap against current `main`; do not reopen a completed foundation because an older issue body, historical roadmap paragraph or sub-slice document still describes it as future work.

## Current state — 2026-08-19

The following foundations are implemented and must not be reopened as generic backlog items:

- Website → HestivaOS structured Quote ingestion, integration authentication, idempotency/replay handling, HestivaOS-owned pricing/profitability and Quote persistence.
- Website contact-enquiry ingestion with durable HestivaOS-owned `ENQ-YYYYMMDD-NNNN` references and idempotent immutable-submission replay; Website consumer cutover remains coordinated after OS deployment.
- Customer/Property Quote match-or-review, Admin Quote review, atomic ONE_TIME acceptance, supported recurring acceptance and non-lossy accepted-Quote operational handoff.
- Work Order add-on quantities and Laundry/Ironing capacity controls.
- Zero/one/many Technician assignment, Crew/Job Leader snapshots and unassigned Needs Attention.
- Homent Technician assignment-scoped PWA, Start Job, frozen Execution Scope, compressed checklist, offline Execution Evidence and Complete Job.
- Controlled Work Order material changes, scope-mismatch/additional-work resolution, interrupted visits, linked replacement visits and incident review.
- Dashboard Needs Attention foundation.
- Work Order access readiness, protected temporary credentials, appointment-relative escalation and human-triggered access recovery.
- Supervisor Operational Review.
- Private Execution Evidence signed-read hardening and append-only authorized post-completion Technician corrections.
- Admin Service Scope Template management, pre-start revision comparison/adoption, Management gateway and canonical direct Work Order creation.
- Provider-neutral WhatsApp/Messenger contracts plus durable conversation/message/status persistence used by access recovery.
- Work Order and Shift Planning relationship selectors use bounded/debounced server-backed search rather than fixed 100-record snapshots.

Live Meta WhatsApp/Messenger connectivity, broad customer correspondence and Finance runtime are **not** implied by those completed foundations.

## Phase 1 — safe Admin/Operations completion

- **Phase 1A merged:** Work Order Customer, Property, Technician, Crew, primary Service and add-on Service selectors use bounded/debounced server-backed search instead of fixed 100-record reference snapshots. Direct-create Customer/Property canonical-ID preselection remains resolvable beyond the first result page, selected historical records remain visible while searches refresh, and the existing domain APIs remain authoritative. See `docs/WORK_ORDER_SELECTOR_SEARCH_V1.md`.
- **Phase 1B merged:** Shift Planning Crew, Technician and linked Work Order selectors use the same bounded/debounced existing domain APIs rather than fixed 100-record snapshots. Existing selected/historical relationships remain available while search results refresh; no scheduling or staffing policy changed.
- **Website enquiry runtime completed pending merge/deploy:** HestivaOS now owns guarded durable Website contact-enquiry intake, immutable-submission replay/conflict handling and `ENQ-YYYYMMDD-NNNN` allocation. The Website repository must switch its contact flow only after this OS runtime is merged/deployed and coordinated through Issue #73.
- **Recurring lifecycle audit in progress:** current source already preserves generated Work Orders across pause/cancel and manual resume already skips backlog. PR #150 surfaces already-created future visits for explicit Admin review before lifecycle actions. Persisted automatic resume-date scheduling remains a separate verified residual requiring schema/migration and a safe due-resume execution boundary. See `docs/RECURRING_LIFECYCLE_REVIEW_V1.md`.
- Add durable administrative access-change audit history and a focused Supabase Admin invitation/provider-session-revocation workflow.
- Design and implement the approved Supabase Auth email-change/confirmation UX; authenticated email remains read-only until this exists.
- Implement Customer duplicate-resolution/merge-reversal or archival only after exact product authority and reversal rules are approved.
- Reconcile remaining evidence-backed controlled fields and subordinate job-type mappings against existing Service / Cleaning Job Template architecture; do not invent lists.

## Phase 2 — Customer Correspondence runtime

Build an HestivaOS-owned correspondence domain before broad automated delivery:

- durable template/version ownership;
- rendered-message history and provenance;
- delivery-attempt/retry/failure state;
- explicit human-approval boundaries where required;
- integration with already-approved booking, completion, reschedule/cancellation and related customer events only after authoritative runtime state exists.

Transport providers must consume HestivaOS business/correspondence state rather than own business decisions.

## Phase 3 — live WhatsApp + Facebook Messenger

Continue from the merged provider-neutral messaging contracts and persistence:

- verify current Meta API versions, webhook verification/signature requirements, permissions, onboarding assets, policy and South African pricing before provider-specific production commitment;
- implement WhatsApp Cloud API webhook/adapter connectivity with verified authenticity, normalization, idempotency, outbound delivery and status handling;
- implement Messenger against the same shared conversation engine and persistence;
- add deliberate provider-identity ↔ canonical Customer linking without fuzzy automatic merges;
- add deterministic Quote/service conversation flows that call HestivaOS authoritative pricing/business boundaries;
- add human takeover/operator handling;
- select/integrate an AI provider only after deterministic flows exist and keep the AI boundary replaceable.

Messaging coordination remains Issue #116. The Website integration remains a separate boundary and `HESTIVA_WEBSITE_INTEGRATION_SECRET` must not be reused for messaging.

## Phase 4 — Needs Attention and notifications

- Add snooze/delegation only as an extension of the existing Needs Attention lifecycle.
- Add active notification delivery with explicit event/priority rules.
- Add Finance, Correspondence and Messaging producers only after their authoritative runtime conditions exist.
- Do not fabricate Worker Issue / Job Exception records before those models are approved and implemented.

## Phase 5 — Finance runtime

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

## Phase 6 — platform and production hardening

### Urgent

- Run the authoritative dependency-security diagnostic/remediation pass for the current Next.js stack.
- Migrate deprecated Next.js `middleware.ts` convention to `proxy` in a separately verified authentication/route-protection change.
- Establish actionable alert delivery for Worker/API liveness/readiness and Supabase dependency failures.

### Operational hardening

- Verify Cloudflare native Git remains the only active web deployment controller after controller/account changes.
- Automate and regularly test database and critical Storage backup/restore procedures.
- Migrate the Railway API away from the legacy `mmapi` hostname with coordinated API variables, CORS, rebuild and verification.
- Remove rollback-only Railway web infrastructure only after rollback procedures are proven.
- Clean up account identity/ownership across GitHub, Cloudflare, Railway and Supabase.
- Design safe orphaned Storage-object reconciliation where database metadata deletion does not delete objects.
- Replace provisional operational costing inputs such as COIDA with authoritative assessed values when available.
- Expand integration, authentication, storage, migration and deployment smoke coverage.
- Mature monitoring with actionable alert thresholds and incident-runbook links.
- Periodically test recovery and audit deployment-controller ownership.

## Phase 7 — final system reconciliation

Before declaring HestivaOS launch-complete:

- run a repository-wide authorization/permission audit;
- audit lifecycle/state-machine and idempotency consistency;
- run clean and staged PostgreSQL migration replay;
- run privacy/security review of evidence, access credentials, messaging and customer data;
- exercise backup/restore and documented recovery procedures;
- verify Website ↔ HestivaOS contracts against both repositories;
- verify WhatsApp/Messenger ↔ HestivaOS contracts and live provider behavior;
- reconcile permanent documentation against runtime one final time;
- close or supersede coordination issues only when their genuine remaining work is complete.

## Backlog guardrail

Do not create future slices named only “Quote handoff”, “Technician app”, “Execution Scope”, “Complete Job”, “Access readiness”, “Supervisor workspace”, “Messaging persistence”, “Service Scope Admin editor”, “Incident workflow” or “Evidence security”. Those foundations are merged. Any future work in those areas must identify a specific verified residual requirement, defect or approved extension.
