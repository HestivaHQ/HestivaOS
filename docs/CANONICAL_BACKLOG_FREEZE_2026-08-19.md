# Canonical backlog freeze — 2026-08-19

This document is a current-state reconciliation checkpoint for HestivaOS after the merged operational, Technician, access, messaging-foundation and Admin/Operations work through PR #145.

It exists to prevent already-completed work from re-entering the implementation backlog and to define the next dependency-ordered implementation phases from verified merged state. It is a current-state planning document, not a replacement for historical ADRs, changelogs, technical work logs or the live cross-system coordination issues.

## Source-of-truth rule

For implementation state, current merged `main` wins over old roadmap text, old issue-body status paragraphs, historical sub-slice documents and earlier coordination comments. Historical documents remain valid records of what was true at the time they were written, but must not be used to reopen work that later merged.

Cross-system routing remains:

- Website ↔ HestivaOS: Issue #73.
- WhatsApp / Facebook Messenger ↔ HestivaOS: Issue #116.
- Current merged repository code, schema, tests, ADRs and permanent contract documents remain the implementation authority.

## Verified completed foundations — do not reopen as generic backlog items

The following areas have merged implementations and may only be revisited for a specific evidenced defect, residual gap or separately approved extension:

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

### Operations, access and management

- Dashboard Needs Attention foundation and initial authoritative producers.
- Visit-specific Work Order access-readiness state/history and Needs Attention integration.
- Protected visit-scoped temporary access credentials with Admin review/reveal/revoke boundary.
- Appointment-relative access escalation and safe Technician readiness projection.
- Human-triggered access recovery using persisted provider-neutral messaging conversations/messages.
- Supervisor Operational Review workspace.
- Admin Service Scope Template manager and pre-start Work Order scope revision comparison/adoption.
- Management gateway and canonical `/work-orders/new` direct-create route.

### Messaging foundation

- Provider-neutral WhatsApp/Messenger messaging contracts and adapter boundary.
- Provider-event idempotency and provider-scoped identity separation.
- Channel-neutral Quote-draft/human-review boundary.
- Durable provider-neutral conversation/message/status-event persistence introduced by the access-recovery slice.

The messaging foundation does **not** mean live Meta production connectivity is complete. No live WhatsApp Cloud API or Messenger provider adapter/webhook activation should be inferred from the persistence foundation.

## Verified remaining implementation backlog

The backlog below is dependency-ordered. Before implementing any item, current `main` must still be inspected to confirm that the specific gap remains.

### Phase 1 — current-state cleanup and remaining safe Admin/Operations gaps

1. Complete controlled-input Phase 3 large-list searchability using debounced/bounded server-side search for the remaining Customer, Property, Crew and Service selectors where current forms still load bounded lists.
2. Implement the documented HestivaOS-owned Website contact-enquiry ingestion and authoritative `ENQ-...` reference boundary; PR #122 recorded ownership only and did not implement the runtime domain/endpoint.
3. Audit recurring-service pause/resume/cancel/auto-resume and already-created-future-visit review behavior against current source; implement only verified missing behavior rather than rebuilding the recurring agreement foundation.
4. Add durable administrative access-change audit history and the separately reviewed Supabase Admin invitation/provider-session-revocation workflow.
5. Design and implement an approved Supabase Auth email-change/confirmation UX; authenticated email remains read-only until that workflow exists.
6. Implement controlled Customer duplicate-resolution/merge-reversal or archival only after the exact authority and reversal product rules are approved. Do not invent destructive merge semantics.
7. Reconcile any remaining evidence-backed controlled fields and subordinate job-type mappings against existing Service / Cleaning Job Template architecture; do not create speculative lists.

### Phase 2 — Customer Correspondence runtime

Build the HestivaOS-owned correspondence runtime before wiring broad automated customer messages:

- durable template/version ownership;
- rendered correspondence history and provenance;
- delivery-attempt/retry/failure state;
- approval/authorization boundaries for correspondence that must remain human-controlled;
- event-driven integration for already-approved booking, completion, reschedule/cancellation and related customer communication only after the runtime authority exists.

Provider transport must not own business decisions. Email, WhatsApp and Messenger should consume authoritative HestivaOS correspondence/business state rather than becoming independent sources of truth.

### Phase 3 — live WhatsApp + Facebook Messenger connectivity

Continue from the merged provider-neutral contracts and persistence rather than creating a second messaging system:

1. Verify current Meta API versions, permissions, onboarding assets, webhook verification/signature requirements and South African policy/pricing before freezing provider-specific behavior.
2. Implement the WhatsApp Cloud API adapter/webhook boundary with verified authenticity, normalization, idempotent persistence and outbound delivery/status handling.
3. Implement the Messenger adapter against the same shared conversation engine and message persistence.
4. Add deliberate provider-identity ↔ canonical Customer linking rules without fuzzy automatic merges.
5. Add deterministic customer quote/service conversation flows that call HestivaOS authoritative Quote/pricing/business boundaries.
6. Add human takeover/operator handling.
7. Select and integrate an AI provider only after deterministic flows exist; keep the AI boundary replaceable and subordinate to HestivaOS authority.

### Phase 4 — Needs Attention and active notification completion

- Add snooze/delegation only as an extension of the existing Needs Attention lifecycle.
- Add active notification delivery with explicit event/priority rules.
- Add Finance, Correspondence and Messaging attention producers only after those authoritative runtime conditions exist.
- Do not create parallel exception state or fabricate Worker Issue / Job Exception records before those models are approved and implemented.

### Phase 5 — Finance runtime

Finance is a major remaining domain. Existing policy/ADRs must be reused rather than redesigned. Implement in bounded reviewed slices:

1. Financial obligations, deposits, balances and clearance state.
2. Incoming payment / proof-of-payment reconciliation.
3. Partial-payment, underpayment, overpayment and manual allocation workflows.
4. Customer credit/unallocated-funds and human-authorized refund workflow.
5. Holds, overdue/collection state, prepayment restrictions and rehabilitation/restoration.
6. Standard recurring standing-advance behavior and month-end billing eligibility/cycles.
7. Invoices, receipts and correspondence integration.
8. Provider-specific collection automation only after a provider and exact authority rules are approved.

Known unresolved owner decisions must remain explicit, including payment/collection provider choice, weekend/public-holiday handling for month-end dates and any future delegation beyond current launch authority.

### Phase 6 — platform and production hardening

- Run the authoritative dependency-security diagnostic/remediation pass.
- Migrate deprecated Next.js `middleware.ts` convention to `proxy` with authentication/route-protection verification.
- Establish actionable alert delivery for Worker/API/liveness/readiness/Supabase dependency failures.
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

## Items intentionally not treated as remaining generic work

Do not create future slices named only “Quote handoff”, “Technician app”, “Execution Scope”, “Complete Job”, “Access readiness”, “Supervisor workspace”, “Messaging persistence”, “Service Scope Admin editor”, “Incident workflow” or “Evidence security”. Those foundations are merged. A new slice in one of these areas must identify a specific verified residual requirement or defect.

## Workflow after this freeze

For every new slice:

1. read current `main` and `AGENTS.md`;
2. verify the proposed backlog item still exists in source;
3. read the applicable permanent docs/ADRs and coordination issue;
4. create one focused branch/PR;
5. implement only the verified gap;
6. synchronize docs and applicable coordination issue;
7. run exact-head repository gates;
8. merge one PR at a time only after review and green gates;
9. re-read current `main` before selecting the next slice.
