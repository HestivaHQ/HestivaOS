# Work Order Access Readiness v1

Status: Phase 3A implementation contract.
Date: 2026-08-18
Coordination: Issue #132; Issue #73 Decisions 48–57.

## Boundary

Access readiness is visit-specific operational state owned by the Work Order. It does not replace stable Property access facts and it does not turn temporary credentials into persistent Property data.

Current `main` already provides visit-specific Work Order access fields and `WorkOrderTemporaryAccessCredential`. Phase 3 extends those foundations rather than creating a competing credential subsystem.

## Readiness states

The Phase 3A runtime distinguishes these operational states without overloading `WorkOrderStatus`:

- `NOT_REQUIRED` — no temporary visit credential is required.
- `REQUIRED_MISSING` — access is required and no usable credential/alternative arrangement is authoritative.
- `RECEIVED` — a visit-specific credential has been received and is currently usable.
- `NEEDS_REVIEW` — candidate access information exists but requires authorized human review before operational use.
- `EXPIRED` — the previously received credential is no longer operationally usable.
- `ARRANGED_OTHER_WAY` — an authorized human recorded that access has been arranged without a stored temporary credential.

Readiness state must never expose the credential secret itself in list payloads, logs, Needs Attention summaries or audit notes.

## Needs Attention

`REQUIRED_MISSING`, `NEEDS_REVIEW`, and `EXPIRED` are authoritative access exceptions. They may produce deterministic Needs Attention items when the Work Order remains operationally relevant. The attention condition self-resolves when readiness becomes `NOT_REQUIRED`, `RECEIVED`, or `ARRANGED_OTHER_WAY`, or when the Work Order is no longer an actionable future/current visit.

Access attention does not cancel the Work Order, alter Finance state, send customer correspondence, or authorize dispatch overrides.

## Security and history

Temporary credentials remain Work Order/visit-specific, need-to-know, and auditable. Expiry or completion removes operational usability but must not silently delete protected history. Replacement visits and future recurring visits do not inherit temporary credentials by default.

Phase 3B owns protected credential storage/review hardening. Phase 3C owns time-relative escalation and broader operational UX. Phase 3D owns the messaging integration boundary and must coordinate with Issue #116 before changing shared messaging contracts.