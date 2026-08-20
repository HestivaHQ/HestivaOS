# Canonical backlog freeze — 2026-08-20

This checkpoint supersedes `CANONICAL_BACKLOG_FREEZE_2026-08-19.md` as the current planning reconciliation point. The 2026-08-19 file remains preserved as historical planning context.

## Source-of-truth rule

Current merged code, schema, tests, current-state documentation, ADRs and active coordination records are authoritative. Old roadmap text, historical audit planning statements and completed slice descriptions must not reopen merged or explicitly closed work.

Cross-system routing remains:

- Website ↔ HestivaOS: Issue #73.
- WhatsApp / Facebook Messenger ↔ HestivaOS: Issue #116.

## Phase 1 reconciliation

The following Phase 1 residuals are complete and must not be reopened generically:

- scalable Work Order and Shift Planning relationship selectors;
- Website enquiry ingestion/cutover;
- recurring-service lifecycle review and persisted automatic resume;
- application-owned Admin access audit history;
- bounded Supabase Admin invitation and provider-session revocation;
- authenticated Supabase email-change/confirmation UX;
- remaining generic controlled-input / subordinate-job-type review.

The controlled-input review concluded that the historical Website `JOB_TYPES` values are not an approved operational taxonomy. They mix frequency, property context, service scope/condition, add-on grouping and manual-review concepts that already have separate canonical HestivaOS owners. No approved Technician skills taxonomy or subordinate Cleaning Job Template job-type vocabulary exists. No runtime list/model/enum is therefore authorized from that residual.

### Remaining Phase 1 item

**Customer duplicate resolution / merge reversal / archival remains blocked.** Do not implement destructive merge behavior until product authority explicitly approves:

- who may merge;
- exact duplicate-match/review authority;
- which record survives;
- relationship/history retention;
- reversal semantics;
- archival semantics;
- effects on Quotes, Properties, Work Orders, recurring agreements, correspondence and Finance history.

Because that item is decision-blocked, normal implementation may proceed to the next dependency-ready phase rather than inventing merge behavior.

## Next dependency-ready phase

Proceed with **Customer Correspondence runtime** in this order:

1. durable template/version ownership;
2. rendered correspondence history and provenance;
3. delivery-attempt/retry/failure state;
4. explicit human-approval boundaries where required;
5. event-driven integration with already-approved customer events only after the correspondence authority exists.

Transport providers must consume HestivaOS correspondence/business state rather than own business decisions. Establish this shared correspondence boundary before broad Messaging or Finance delivery so those domains do not create competing outbound-history models.

## Later phases

After the correspondence foundation:

- continue live WhatsApp/Messenger provider connectivity against the existing provider-neutral messaging foundation and Issue #116;
- extend Needs Attention/active notifications only from authoritative producer domains;
- implement Finance in bounded dependency order, integrating invoices/receipts with the correspondence runtime;
- continue independent platform hardening where it does not collide with active schema/security/CI work;
- perform final repository/system reconciliation only after runtime domains are complete.

## Backlog guardrail

Do not create future slices named only `controlled fields`, `subordinate job types`, `Technician skills`, or `Website JOB_TYPES mapping`. Any future work in those areas must cite a new approved vocabulary, explicit product decision, or concrete defect.

Use the ADR-0067 three-stage workflow and ADR-0069 documentation authority model for every subsequent slice. Merge only the exact reviewed/tested head after all mandatory CI gates are green and current-main/parallel-lane review remains clean.
