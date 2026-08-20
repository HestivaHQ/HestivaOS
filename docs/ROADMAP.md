# Technical roadmap

This roadmap records only verified current planned work. Historical implementation detail remains in ADRs, `docs/CHANGELOG.md`, `docs/TECHNICAL_WORK_LOG.md`, focused contract documents and merged PR history.

The canonical reconciliation checkpoint for the current backlog is `docs/CANONICAL_BACKLOG_FREEZE_2026-08-20.md`. Before starting any slice, verify the specific gap against current `main`; do not reopen a completed foundation because an older issue body, historical roadmap paragraph or sub-slice document still describes it as future work.

## Current state — 2026-08-20

The following foundations are implemented or explicitly closed by evidence review and must not be reopened as generic backlog items:

- Website → HestivaOS structured Quote ingestion, integration authentication, idempotency/replay handling, HestivaOS-owned pricing/profitability and Quote persistence.
- Website contact-enquiry ingestion with durable HestivaOS-owned `ENQ-YYYYMMDD-NNNN` references and idempotent immutable-submission replay; the Website contact consumer cutover is merged and requires the authoritative `ENQ-...` acknowledgement before reporting successful intake.
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
- The first direct Meta WhatsApp Cloud API runtime edge is implemented behind the provider-neutral adapter: public subscription verification, raw-body HMAC authentication, normalized inbound message persistence and configured text outbound transport. Production Meta credentials/onboarding are deployment-owned and are not committed or activated by the repository slice.
- Work Order and Shift Planning relationship selectors use bounded/debounced server-backed search rather than fixed 100-record snapshots.
- Recurring-service lifecycle preserves generated Work Orders, surfaces future visits for review, skips paused backlog on resume, and supports persisted Johannesburg automatic-resume dates through a database-guarded Railway API reconciler.
- Administrative role/status changes have append-only application-owned audit history with actor/target identity snapshots and old/new role/status values, written atomically with effective access mutations and exposed through a bounded ADMIN-only history read.
- Bounded Supabase provider administration supports ADMIN-only email invitations and refresh-session revocation after HestivaOS access disablement while preserving the Supabase identity and keeping canonical `User.role` / `User.status` authoritative.
- Authenticated profile email changes use HestivaOS conflict preflight plus Supabase confirmation, preserve the same application User/Auth UUID binding, and reconcile only the provider-confirmed email through the existing fail-closed sync path.
- The generic controlled-input/subordinate-job-type residual is closed by `CONTROLLED_INPUT_RESIDUAL_REVIEW_2026-08-20.md`: Website `JOB_TYPES` are explicitly non-canonical mixed concepts and no approved Technician-skills or subordinate Cleaning Job Template taxonomy exists to implement.
- Customer Correspondence has HestivaOS-owned durable template identity and immutable `DRAFT` / `PUBLISHED` / `RETIRED` version history with ADMIN-only management; publishing atomically retires the prior published version.
- Customer Correspondence also has append-only rendered history/provenance anchored to the exact published template version, with exact subject/body, recipient snapshot, template key/version snapshot and server-stamped actor provenance; a rendered record does not imply delivery.
- Customer Correspondence has provider-neutral append-only delivery-attempt chains with immutable `PENDING` / `ACCEPTED` / `FAILED` events, linear retry-from-latest-failure semantics and no automatic retry timing or live-provider send behavior.
- Customer Correspondence delivery attempts, including retries, require explicit ADMIN initiation; materialization alone never authorizes delivery.
- Accepted Quote bookings, acknowledged Work Order completions, and committed controlled Work Order reschedule/cancellation operations can be materialized idempotently into immutable Correspondence history from their authoritative source state without creating a delivery attempt or selecting a provider.
- Repository development uses the ADR-0067 three-stage workflow: proportional fast-loop checks, one documentation/current-main/full-diff reconciliation before final validation, parallel authoritative PR CI, and strict exact-head pre-merge review.

Live Facebook Messenger connectivity, broad customer correspondence delivery and Finance runtime are **not** implied by those completed foundations. WhatsApp production activation still requires the actual Meta business assets, approved credentials/configuration and provider onboarding outside the repository.

## Execution strategy

Use one focused implementation lane at a time for schema-heavy, authentication/security, or shared-domain work. Parallel lanes are appropriate only when current-main and active-PR inspection prove they do not compete for migrations, Prisma models, ADR/global identifiers, shared API contracts or the same canonical history/current-state documents.

For each slice, use the three-stage workflow in `AGENTS.md` and ADR-0067: fast proportional development checks while the branch is fluid; final documentation/current-main/complete-diff reconciliation once implementation stabilizes; then one frozen exact head through all required GitHub jobs and strict pre-merge review. Do not use chat memory as backlog authority.

## Phase 1 — safe Admin/Operations completion

All dependency-ready Phase 1 Admin/Operations residuals are complete or explicitly closed by evidence review. One item remains blocked:

1. **Customer duplicate resolution / merge reversal / archival.** Product-decision-blocked until exact merge authority, reversal semantics, history retention and archival behavior are approved. Do not implement destructive merge behavior speculatively.

Because the remaining Phase 1 item is decision-blocked, proceed with the next dependency-ready phase rather than inventing merge semantics.

## Phase 2 — Customer Correspondence runtime

Template/version ownership, rendered-message history/provenance, provider-neutral delivery-attempt/retry/failure state, the conservative human delivery gate, accepted-Quote booking materialization, acknowledged-completion materialization, and controlled Work Order reschedule/cancellation materialization are implemented. Phase 2's currently approved correspondence foundation is therefore complete.

Booking materialization uses the existing atomic accepted-Quote-to-Work-Order boundary. Completion materialization uses the existing Work Order acknowledgement/eligibility boundary. Reschedule/cancellation materialization uses the immutable controlled Work Order material-change operation identity and persisted requested changes. None of these integrations creates a delivery attempt. No hard-coded event-to-template binding is approved; a published template version is selected explicitly until that policy exists.

Transport providers must consume HestivaOS business/correspondence state rather than own business decisions. Live adapter/provider selection and provider-specific safe-retry semantics remain separate decisions in the next phase.

## Phase 3 — live WhatsApp + Facebook Messenger

Continue from the merged provider-neutral messaging contracts and persistence. The direct Meta WhatsApp direction is approved. On 2026-08-20 the initial provider edge was reverified against current Meta-owned Cloud API material for the primary permissions, business/WABA/phone-number onboarding shape, webhook subscription verification and raw-body `X-Hub-Signature-256` authenticity requirement. The repository deliberately does not hard-code a moving Graph API version; deployment must select a currently supported version after provider verification.

1. **WhatsApp provider edge v1:** authenticated webhook subscription and POST signature verification, normalization into HestivaOS messaging persistence, and configured text outbound transport are implemented. Production credentials/onboarding remain deployment-owned and inactive until configured.
2. Add provider delivery/read/failure status ingestion, richer authorized outbound message kinds, media download/securing where required, and explicit safe-retry/reconciliation behavior around uncertain provider sends.
3. Implement Messenger against the same shared conversation engine and persistence, with current Meta webhook/signature, Page token/permission and messaging-window policy verification before activation.
4. Add deliberate provider-identity ↔ canonical Customer linking without fuzzy automatic merges.
5. Add deterministic Quote/service conversation flows that call HestivaOS authoritative pricing/business boundaries.
6. Add human takeover/operator handling.
7. Select/integrate an AI provider only after deterministic flows exist and keep the AI boundary replaceable.

Messaging coordination remains Issue #116. The Website integration remains a separate boundary and `HESTIVA_WEBSITE_INTEGRATION_SECRET` must not be reused for messaging.

WhatsApp and Messenger provider adapters may be separate PRs once the shared provider contract is stable; do not parallelize them while both are still changing the same normalization/idempotency contracts.

## Phase 4 — Needs Attention and notifications

1. add snooze/delegation only as an extension of the existing Needs Attention lifecycle;
2. add active notification delivery with explicit event/priority rules;
3. add Finance, Correspondence and Messaging producers only after their authoritative runtime conditions exist;
4. do not fabricate Worker Issue / Job Exception records before those models are approved and implemented.

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

Correspondence integration belongs after the Phase 2 correspondence runtime exists so Finance does not create a competing invoice/receipt delivery history model.

## Phase 6 — platform and production hardening

### High priority

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

Independent hardening work may run in parallel with product work only when it does not collide with the active schema/security/CI lane.

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

Do not create future slices named only “Quote handoff”, “Technician app”, “Execution Scope”, “Complete Job”, “Access readiness”, “Supervisor workspace”, “Messaging persistence”, “Service Scope Admin editor”, “Incident workflow”, “Evidence security”, “Website enquiry ingestion”, “scalable selectors”, “recurring auto-resume”, “admin access audit history”, “Supabase Admin invitation/provider-session revocation”, “Supabase Auth email-change/confirmation UX”, “controlled fields”, “subordinate job types”, “Technician skills”, “Website JOB_TYPES mapping”, “Correspondence template/version ownership”, “rendered correspondence history/provenance”, “Correspondence delivery-attempt/retry/failure state”, “Correspondence human-approval boundary”, “Work Order completion correspondence materialization”, “accepted Quote booking correspondence materialization”, “controlled Work Order reschedule/cancellation correspondence materialization” or “WhatsApp webhook authentication foundation”. Those foundations are merged or explicitly closed by evidence review. Any future work in those areas must identify a specific verified residual requirement, defect or newly approved vocabulary/extension.
