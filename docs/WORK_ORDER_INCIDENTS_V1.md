# Work Order Incidents v1

Status: Phase 4A implemented contract.
Date: 2026-08-19.

## Purpose and field authority

An assigned active Technician may append a serious field incident from `/technician`. Controlled categories are `SAFETY_CRITICAL_STOP`, `PROPERTY_OR_ITEM_DAMAGE`, `CUSTOMER_OR_PROPERTY_CONDITION`, and `OPERATIONAL_INCIDENT`. Each immutable report stores the Work Order, reporting Technician, contemporaneous Job Leader snapshot, optional active Execution Scope section, field time, concise factual note, stable client operation UUID/request hash, and linked Execution Evidence.

The operation is written to the existing IndexedDB `operations` store before success is shown. It retries idempotently; a conflicting reuse is retained for review. Incident photos use the existing local-first `evidence` store, compressor, private session-bound upload, deterministic object path, and server acknowledgement pipeline. Pending upload does not prevent reporting once capture is durable locally.

`SAFETY_CRITICAL_STOP` reuses the established execution safety meaning. Reporting is independent of ordinary checklist completion. It neither changes Work Order status nor silently creates an interruption. When work cannot continue, the Job Leader separately uses the authoritative interrupted-visit workflow. Scope mismatch facts likewise remain separate.

## Management and Needs Attention

ADMIN and SUPERVISOR can read incident context and append `ACKNOWLEDGE`, `RESOLVE`, or `REOPEN` reviews. Resolution requires one neutral classification: `NO_FURTHER_OPERATIONAL_ACTION`, `FOLLOW_UP_COMPLETED`, or `ESCALATED_OUTSIDE_WORKFLOW`. Actor/time and optional factual note are retained; the original report/evidence are never rewritten.

Every unresolved incident reconciles into the shared Needs Attention queue with condition key `work-order-incident:<incident-id>:review`, a direct Work Order incident link, and Management Review ownership policy. Safety-critical incidents are Critical; other incident categories are High. Authoritative resolution auto-resolves the condition, and an explicit reopen reopens the same occurrence without duplicate alert spam.

## Boundaries

Completion does not resolve incidents. Incident creation does not duplicate scope-mismatch, interruption, replacement-visit, completion, or Needs Attention domains. It sends no customer correspondence and creates no notification transport. It makes no liability, negligence, compensation, insurance, disciplinary, Finance, refund, credit, charge, deduction, or payment finding. Evidence remains non-public; broader evidence-read hardening is deferred.
