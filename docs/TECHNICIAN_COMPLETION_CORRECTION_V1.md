# Technician Completion Correction v1

## Current contract

ADMIN and SUPERVISOR may authorize one active correction for an authoritative completed Work Order. Authorization records a stable operation identity, factual reason, exact section IDs from the frozen Execution Scope, the original completion identity/times, the original completing Technician, authorizer, and the acknowledgement/correspondence-eligibility snapshot. Authorization is idempotent and does not change `COMPLETED`, scheduling, assignment, Job Leader, scope, evidence, incidents, interruptions, scope mismatches, Finance, pricing, or customer correspondence.

Only the active assigned Technician whose original completion is identified by the correction may record a corrected outcome. Each outcome is a new `ExecutionSectionOutcomeEvent` linked to the correction and only an authorized section is accepted. Existing outcomes and operational history are never updated or deleted. The first accepted corrected outcome moves the aggregate from `AUTHORIZED` to `IN_PROGRESS`; it preserves any current acknowledgement in the correction snapshot, then makes the canonical completion acknowledgement and correspondence eligibility non-current. Corrected resubmission requires an actual linked outcome and moves the aggregate to `RESUBMITTED` without changing the Work Order from `COMPLETED`.

A corrected resubmission must receive a fresh ADMIN/SUPERVISOR acknowledgement through the existing completion acknowledgement endpoint. There is no second acknowledgement or correspondence system.

## Offline and idempotency

Technician corrected outcomes use the existing IndexedDB `operations` store and section-outcome reconciliation. Corrected resubmission uses the same store. Stable UUID operation IDs converge safe retries; reuse with different correction, section, Technician, payload, or resubmission facts is rejected. Client 4xx conflicts remain `NEEDS_REVIEW` records rather than being silently discarded.

## APIs

- `GET /work-orders/:id/completion-corrections` — ADMIN/SUPERVISOR history.
- `POST /work-orders/:id/completion-corrections` — ADMIN/SUPERVISOR authorization.
- `POST /technician/jobs/:id/completion-corrections/:correctionId/sections/:sectionId/outcomes` — assigned original Technician outcome.
- `POST /technician/jobs/:id/completion-corrections/:correctionId/resubmit` — corrected completion resubmission.

Private Execution Evidence retrieval remains governed by `EXECUTION_EVIDENCE_SECURITY_V1.md`; this workflow does not expose storage paths or create evidence access behavior.
