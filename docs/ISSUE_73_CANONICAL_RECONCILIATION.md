# Issue #73 Canonical Reconciliation Baseline

Status: approved product intent and implementation-planning baseline derived from HestivaHQ/HestivaOS Issue #73. This document does **not** claim that every requirement below is implemented in runtime.

Coordination source: HestivaHQ/HestivaOS Issue #73 — Slice 5M Website ↔ HestivaOS Integration Contract.

## Purpose

Issue #73 began as the Website ↔ HestivaOS Slice 5M coordination record, but later comments accumulated approved HestivaOS product, operational, correspondence, financial, customer/location, access-readiness, and command-centre requirements. Several checkpoints explicitly required later reconciliation into permanent repository documentation.

This document provides that durable reconciliation baseline without rewriting implementation history or inventing unresolved schema/API details. It is intentionally additive while other active development lanes are open. It does not replace existing ADRs or current-state architecture documents; where a requirement is already implemented and permanently documented elsewhere, those implementation records remain authoritative for current runtime state.

## Current Slice 5M baseline

The Issue #73 reconciliation checkpoint of 14 August 2026 records that the following were already implemented or no longer pending at that time:

- authoritative HestivaOS Quote aggregate, immutable revisions/line items, public `Q-YYYYMMDD-####` identity, submission idempotency identity, Quote activity history, and Quote-photo provenance/status foundation;
- structured Website Quote contracts v1/v2 using controlled fields instead of reconstructing operational truth from email/free text;
- deterministic catalogue/value alignment for resolved Slice 5M product decisions, including bathrooms, Post-Renovation Cleaning, eco-friendly preference, quantity-bearing add-ons, exact-floor transport, and structured Laundry/Ironing;
- guarded Website → HestivaOS Quote ingestion with HestivaOS-owned validation, authoritative pricing/profitability, replay/conflict handling, OpenRouteService road-distance costing, and atomic new-Quote persistence;
- server-to-server integration authentication and retry/idempotency boundaries;
- Work Order / Recurring Service add-on quantity persistence and Laundry/Ironing capacity controls;
- material financial product policy through the then-current financial ADRs.

Do not reopen those decisions merely because the original Issue #73 body still contains older pending-language.

## Remaining Slice 5M work identified by Issue #73

The same checkpoint identifies genuine remaining implementation areas:

- accepted-Quote decision/orchestration: protected Admin Accept/Decline confirmation/deep-link flow, 30-day action expiry/reactivation, reversible decisions and audit history;
- transactional accepted-Quote import: Customer match-or-review, Property match-or-review, no silent overwrite, one-time Quote → pending Work Order, recurring Quote → Recurring Service Agreement + initial pending Work Order, all-or-nothing behavior, operational links back to Quote, and safe retry without duplicates;
- pending review / approval: imported-record review, preservation of original submitted values, minimum operational-information and safety checks, and Admin-only accepted pricing before approval/booking confirmation;
- remaining non-Laundry persistence/storage mapping, including exact unit/floor/building access destination where still required and durable Quote-photo storage/deduplication/recovery;
- visible recovery/alerting for persistent Website → OS integration failure and acceptance blocking while a Quote remains `NEEDS_ATTENTION`;
- customer correspondence across Quote acceptance, booking confirmation, reschedule/cancellation and later financial correspondence;
- financial-domain runtime including persistence/API/UI, payment verification and reversal audit, invoice/receipt/credit records, recurring payment arrangements, month-end statements, Upcoming Payments/cash-flow, holds/suspensions/disputes/refunds and financial correspondence automation.

## Customer Correspondence architecture

Issue #73 approved a centralized HestivaOS Customer Correspondence domain with these durable product boundaries:

- HestivaOS owns a centralized, auditable Customer Correspondence domain covering the full customer lifecycle rather than feature-specific direct sends.
- Automated launch delivery is email-only, while the business-event/policy architecture remains channel-agnostic for future WhatsApp/SMS expansion.
- Customer-facing features must not independently hard-code provider sends. Customer-relevant business events feed correspondence policy and versioned template/delivery behavior.
- Correspondence is event-driven. Immediate lifecycle changes emit relevant business events; scheduled communication derives from authoritative schedules and becomes due at the appropriate time.
- Every customer-relevant event requires an explicit correspondence policy; this does not imply customer email for every internal event.
- Permanent audit history is required for attempted correspondence, including unsuccessful, suppressed and manually resent items where applicable.
- Historical correspondence must preserve the exact rendered customer-facing content actually sent, not only a mutable template pointer.
- Correspondence policy modes are:
  - `AUTO_SEND`
  - `ADMIN_APPROVAL`
  - `MANUAL_ONLY`
  - `NO_CUSTOMER_MESSAGE`
- Routine deterministic messages are candidates for `AUTO_SEND`; sensitive, ambiguous or exceptional situations require human control.
- Automated correspondence failure must never fail silently. Transient failure uses controlled retry; exhausted retry creates explicit Admin attention. Time-critical failures receive higher-priority visibility.
- Delivery failure does not roll back or falsify the underlying business transaction.
- Authorized Admin may record manual-contact resolution with actor/time/method/note provenance.
- Automated customer email must be reply-capable and route replies to a monitored Homent mailbox at launch.
- Templates are centrally managed, branded and versioned, use structured authoritative variables, validate required variables before delivery, and preserve final edited/rendered content where Admin approval allows editing.
- Default service reminder is one reminder at 18:00 on the evening before scheduled service, timezone-aware and revalidated immediately before send so obsolete reminders are suppressed.
- Customer email is operational/customer correspondence only; newsletters, promotional email campaigns and marketing-email subscription machinery are out of scope.
- Correspondence should be purposeful and consolidated: one meaningful customer item per business event where practical, with duplicate prevention.
- Free-form inbound customer replies are human-handled at launch and must not autonomously cause consequential state changes.
- Correspondence state/history must be visible contextually on related business records and through a central Admin correspondence/attention queue for unresolved approvals/failures.
- HestivaOS must maintain a version-controlled canonical Correspondence Event Catalogue. New automated customer correspondence is introduced through explicit catalogue/event-policy additions, not ad-hoc direct sends.

Provider choice, exact retry counts/backoff, persistence schema/API/UI, detailed template catalogue, inbound-email integration and provider-specific webhook details remain implementation decisions unless recorded elsewhere by a later ADR/implementation.

## Payment, reflection and financial-clearance policy — Decisions 18–27

Approved requirements:

### 18 — State-aware payment reminders and bank-reflection allowance

- Distinguish no evidence of payment from acceptable POP received.
- Acceptable POP may move an obligation into a `PAYMENT_PENDING_REFLECTION`-type state; POP is not proof that money is received.
- Ordinary overdue reminders are suppressed during a 3-business-day reflection allowance after valid POP.
- If funds still do not reflect after that allowance, create Admin review first rather than automatically accusing the customer of non-payment.
- Encourage PayShap/immediate payment for first-time customers where practical.
- Only authoritative verified receipt/reflection marks payment paid.

### 19 — POP evidence and verification

- POP is supporting evidence only and never creates an authoritative ledger receipt.
- Preserve original POP and structured facts where available.
- Material mismatch or uncertain association routes to Admin review.
- AI/document extraction may assist but has no authority to declare funds received.

### 20–22 — First-time and returning-customer payment behavior

- First-time service requires verified payment before dispatch by default; POP pending reflection alone does not authorize dispatch without an authorized exception.
- Normal first-time bookings receive payment instructions/deadline when booking is confirmed; same-day/next-day first services require an immediate-payment method.
- Missed payment deadline makes the booking financially uncleared and attention-required; it does not silently cancel it.
- Returning customers in good financial standing may use normal approved terms without verified prepayment before every service.
- Good-standing privilege can be removed by concrete financial facts; do not use informal memory or opaque scoring.

### 23 — Explicit financial-clearance states

Product-level state concepts:

- `GOOD_STANDING`
- `PAYMENT_PENDING_REFLECTION`
- `PAYMENT_ATTENTION_REQUIRED`
- `PREPAYMENT_REQUIRED`
- `SERVICE_HOLD`

Restrictions derive from concrete approved facts, not an opaque customer risk score. Admin override/change preserves actor/time/reason. Restrictions are reassessed when causes resolve.

### 24–27 — Prepayment, hold and operational cutoff

- `PREPAYMENT_REQUIRED` responds to actual payment-risk behavior; a single legitimate slow EFT with valid POP does not count against the customer merely because of bank delay.
- `SERVICE_HOLD` prevents future dispatch/service where approved financial conditions justify it; it does not erase completed work or financial history.
- A valid reflection allowance does not automatically cause hold.
- Financially blocked Work Orders remain bookings but are visibly blocked from dispatch/service; ordinary reminders that imply service is proceeding are suppressed.
- Financial eligibility determines whether service may proceed; scheduling owns the eventual booking outcome.
- The operational clearance cutoff is tied to service start/dispatch and remains configurable rather than hard-coded universally.
- At cutoff, unresolved financial blockage raises high-priority Admin action. No dispatch occurs unless resolved or explicitly overridden by authorized Admin.

## Canonical Proof-of-Payment and reconciliation system — Decisions 28–37

### 28 — One multi-channel POP ingestion workflow

HestivaOS must provide one canonical POP evidence workflow regardless of intake channel.

Preferred route:

- secure tokenized customer POP-upload link associated with the relevant payment obligation;
- no HestivaOS customer account/password required merely to submit POP;
- minimum customer-facing context only;
- non-predictable credentials/tokens with appropriate expiry/security controls;
- authoritative association to the intended Customer/Work Order/payment obligation when token context is sufficient.

Supported routes also include monitored email attachments and WhatsApp-origin POP. All channels normalize into the same auditable evidence/reflection workflow. Ambiguous matches require human resolution. No channel, parser, AI or document extraction tool may declare funds received.

Required implementation capability includes secure upload/API, durable evidence/file storage, association/provenance, Admin attach/reconcile workflow, reflection-state integration and future-safe inbound email/WhatsApp adapter points.

### 29–32 — Customer status, notifications, file safety and duplicate evidence

- A lightweight secure payment-status/POP page may show only narrowly scoped payment status/context and must not become a full customer portal by accident.
- Send meaningful payment-status correspondence only; successful POP submission is acknowledged, and verified/reflected payment triggers payment-received confirmation.
- Treat uploads as untrusted files. Initially support only required formats such as PDF/JPG/JPEG/PNG with sensible size limits, verify file type server-side, perform security/malware validation before Admin access, keep originals private and unchanged, and expose controlled/auditable access.
- Unsafe/unusable uploads do not start reflection allowance.
- Exact duplicate POP submissions must not create multiple apparent payment evidence objects. Deduplication is evidence management only and never establishes receipt.

### 33–37 — Human financial authority and append-only correction

- Authorized human confirmation is mandatory before manual-EFT obligations are marked received/paid.
- Matching/AI/bank-feed assistance may suggest but not commit reconciliation.
- Reconciliation preserves actor/time/source transaction/allocation context.
- Reconciliation mistakes use a first-class append-only reversal action requiring reason and confirmation; never delete/overwrite original history.
- Reconciliation UI must show amount due vs amount received and classify exact/under/over-payment before confirmation.
- Partial payment settles only the reconciled amount and leaves exact outstanding balance.
- Overpayment excess becomes explicit customer credit/unallocated funds; do not silently recognize it as revenue or automatically apply it to another obligation.
- One bank transaction may be manually allocated across multiple obligations with explicit Admin confirmation; each allocation is auditable/reversible.
- Refund workflow is human-authorized and distinguishes proposal/approval, awaiting actual refund payment, outgoing reconciliation/confirmation and completed refund. Approval does not mean funds have been returned.

## Financial controls, delivery and contact validation — Decisions 38–47

- Financial authority is granular. Viewing financial data does not automatically grant reconciliation, reversal, allocation, refund, restriction or hold-override powers.
- Launch permits a single authorized user for allowed financial actions; architecture may support future dual approval without requiring it now.
- Material financial actions show consequence preview before commit; reversals/overrides require reason.
- Committed financial history is system-wide append-only. Corrections use linked reversal/correction events. No generic `Delete payment` control is approved.
- Preserve/expand an authorized pre-production reset capability; final production launch starts from a verified clean baseline, but destructive production wipe is not a routine financial-history backdoor.
- Pre-production reset should distinguish transactional test-data clear from deeper/full reset; exact deletion/preservation matrix is implementation work.
- Email correspondence business logic must be provider-independent behind a delivery adapter.
- Correspondence should distinguish provider acceptance/sent from provider-reported delivered where supported and track exception states such as failed/bounced/suppressed/cancelled.
- Permanent delivery failure creates visible Admin attention.
- A permanently undeliverable email becomes delivery-invalid, stops routine automated email to that address until corrected, preserves failure history, and uses selective recovery rather than blindly resending obsolete history.
- Website and HestivaOS share canonical contact validation. Email is strongly validated. South African mobile values are deterministically normalized/validated to E.164-compatible form; fuzzy repair is not allowed. Persist contact validity/delivery health. OTP verification of every contact is not required at launch.

## Customer, Service Location and temporary access — Decisions 48–57

- Customer email/phone changes are versioned/auditable rather than destructive; historical business records retain the contact context used at the time.
- Duplicate-customer detection is assisted using normalized identifiers. Humans decide whether to reuse/create; no unsafe automatic merge.
- Customer merge is deliberate, non-destructive and reversible in architecture: one canonical Customer, merged record preserved, related history retained, conflicting values explicitly resolved, actor/time preserved.
- A Customer may own multiple Service Locations/Properties; Quotes/Work Orders link to the specific location serviced.
- Stable location facts belong to Service Location; temporary visit-specific instructions belong to Quote/Work Order and do not silently rewrite persistent Property data.
- Temporary access credentials belong to the specific Work Order/visit, may be single-entry/time-limited, do not automatically roll into future recurring visits, remain protected history after expiry/completion, and require need-to-know access/audit controls.
- Temporary credentials may be text, QR, image, PDF or other supported access-pass attachments. Preserve original attachment privately; extracted metadata is supplementary.
- Launch direction for temporary access: early-morning Admin attention when today's job needs a credential, human-triggered outbound WhatsApp request, and future/available inbound WhatsApp integration that can identify candidate credentials. Ambiguous cases require Admin review.
- Work Order requires a first-class `Pull access credential from WhatsApp`-type recovery action where that integration exists; retain original message provenance.
- Access-controlled Work Orders expose explicit readiness such as required/missing, received, needs review, expired or otherwise arranged/not required.
- Missing access escalates relative to appointment time, clears when resolved, never automatically cancels the Work Order, and supports a human resolution such as `Access arranged another way`.

## Dashboard / Needs Attention command-centre UX — Decisions 58–67

- The existing Dashboard becomes the Today/Operations command centre. Do not create a duplicate Operations module merely to show today's state.
- Dashboard answers: **What needs my attention today?** and is exception/readiness-driven.
- System-wide UX rule: **Normal = quiet and compact. Exception = visible and actionable. Detail = available on demand.**
- Recommended hierarchy: **Needs Attention → Today's Work → Shortcuts → Upcoming**.
- Healthy states collapse quietly (for example `Ready`); do not fill the screen with green success badges.
- Needs Attention contains actionable exceptions only, not routine informational success events.
- Live attention items primarily represent unresolved underlying conditions and self-resolve when the condition is fixed where deterministically possible; preserve occurrence/resolution in audit/activity history.
- Prioritization is deterministic and based on consequence, time to affected service/deadline, blocking potential and overdue/escalated state; do not use opaque AI judgment.
- Every attention item should state what is wrong, which job/customer is affected, when it matters, and the next action, with direct deep-link to resolution context.
- Aggregate same-root-cause alert spam without hiding distinct actions.
- Every actionable exception has an eligible owner/queue; reassignment is auditable, and ineligible owners must not orphan exceptions.
- Escalation is deadline-aware. `Seen` is distinct from `Resolved`; seeing an item does not stop escalation.
- Support lightweight permission-aware `Mine` / `All` views. Critical unresolved items remain visible to authorized Admin even when assigned elsewhere.

## Product/Operations controls — Decisions 68–77

### 68–70 — Escalation, snooze and delegation

- Dashboard/Needs Attention remains the normal exception-management surface; active notifications are reserved for deterministic meaningful escalation thresholds, not every attention item.
- Selected unresolved attention items may be snoozed until a specific time/event, but snooze is never resolution and cannot exceed a safe intervention threshold for deadline-near/critical items. Snoozes are auditable.
- Attention ownership may be temporarily delegated with time bounds, automatic expiry, auditability and permission enforcement. Delegation cannot grant authority the delegate lacks.

### 71 — Automated shift handover

Deferred and **not** a launch requirement. Existing ownership/seen/escalation/audit architecture should not prevent it later, but no standalone shift-handover subsystem should be built now.

### 72–73 — Controlled material Work Order changes

- Material changes to confirmed Work Orders use a controlled audited change action, not silent rewrite.
- Material examples include date/time, service scope, add-ons/quantities, Property/address, cancellation, or changes affecting price, staffing, duration or service delivery.
- Show downstream operational/scheduling/financial/customer-correspondence consequences where applicable before commit.
- Internal non-operational corrections remain simple edits.
- One confirmed material change should normally produce one coherent customer update, not one message per changed field.
- Constraint increases according to actual operational state: future jobs are flexible under controls; imminent jobs use consequence-aware checks; in-progress jobs preserve original scope and record explicit in-service scope changes; completed jobs do not rewrite historical operational truth.
- Risky-but-permitted overrides preserve actor/reason; impossible changes fail closed.

### 74 — On-site material scope differences

- Field staff may flag that actual scope differs from the Work Order and record what was found/requested with evidence where appropriate.
- Field staff must not independently promise chargeable material extra work.
- Admin/HestivaOS controls commercial scope change. Show pricing/capacity/scheduling consequences and obtain appropriate customer approval before chargeable additional work begins.
- Small non-material differences should not create unnecessary bureaucracy.

### 75–77 — Interrupted/failed visits, replacement visits and financial resolution

- Work Orders require a truthful unable-to-complete/interrupted outcome rather than forcing misuse of `CANCELLED` or `COMPLETED` for cases such as no access after attendance, unavailable utilities, unsafe conditions or customer-requested interruption.
- Record auditable reason and route to appropriate next action such as reschedule, follow-up, partial-completion review or financial review.
- If a visit was already attempted/interrupted, do not simply change its date and erase history. Preserve original outcome and create a linked replacement visit using relevant original scope; avoid double charging and send one clear rescheduling confirmation.
- Operational failure/interruption does not automatically determine financial outcome. Where financial consequences exist, create a clear `Financial Resolution Required`-type condition. Authorized Admin selects a policy-compliant resolution and HestivaOS shows consequences before confirmation.
- If funds were already reconciled, use controlled reversal/adjustment rather than rewriting payment history.
- Customer correspondence follows when the financial resolution changes what the customer owes, receives back or has credited.

## Cross-system Website enquiry reference authority

A later Issue #73 decision approves HestivaOS as the authoritative Website enquiry ingestion/reference allocator using an `ENQ` namespace. Current verified state at the time of that decision: no HestivaOS enquiry-ingestion/reference domain existed yet, so this is approved/planned rather than implemented.

This decision is being documented separately in active PR #122. To preserve parallel-lane ownership, this reconciliation branch intentionally does **not** edit `docs/CROSS_SYSTEM_COORDINATION.md` or `docs/WEBSITE_ENQUIRY_REFERENCE_AUTHORITY.md`. After #122 merges, subsequent reconciliation work should treat its merged documentation as canonical and avoid duplicating it here.

## Anti-overengineering rule

Issue #73 explicitly establishes the product rule:

> Build what Hestiva needs to operate safely and efficiently in launch/foreseeable operations. Preserve extensibility for later growth, but defer speculative features until there is a credible operational need.

This is the scope discipline for implementation planning from this reconciliation baseline.

## Implementation sequencing baseline

The safe dependency order for bringing HestivaOS runtime up to the approved Issue #73 product intent is:

1. accepted-Quote decision/orchestration and transactional operational import;
2. pending-review/approval and remaining Quote→Property/Work Order storage mappings;
3. operational readiness / Dashboard Needs Attention foundation;
4. Customer Correspondence foundation and canonical event catalogue;
5. financial-domain foundation, payment obligations/clearance, POP evidence and manual reconciliation;
6. refunds/allocations/holds/Upcoming Payments and financial correspondence;
7. inbound channel adapters and assisted workflows such as email/WhatsApp POP or access-credential ingestion where operationally justified.

This ordering is a planning baseline, not permission to combine those areas into one mega-PR. Each implementation slice should remain independently reviewable and must re-check current `main` and active PRs before work begins.

## Explicit unresolved implementation details

Do not invent details that Issue #73 intentionally leaves open or that a later ADR has not resolved. Examples include:

- exact financial persistence schema/API/UI design;
- any automatic payment/collection provider or authority beyond approved manual-EFT launch policy;
- weekend/public-holiday handling for month-end collection dates where not resolved elsewhere;
- exact correspondence persistence schema/API/UI and provider-specific delivery taxonomy;
- exact email provider, retry counts/backoff and inbound email implementation;
- exact POP token lifetime, file size limits, storage provider/path, malware tooling and automated-match confidence rules;
- exact operational payment-clearance cutoff duration;
- any future delegation of financial authority beyond approved granular permissions;
- speculative enterprise capabilities such as automated shift handover.

When implementation reaches one of these boundaries, resolve it through the applicable ADR/product decision process rather than embedding an unreviewed assumption into code.