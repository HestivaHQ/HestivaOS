# ADR-0055 — Scope mismatch and additional-work resolution

Status: Proposed implementation architecture for Phase 2B; becomes accepted when the implementing PR merges.

Date: 2026-08-18

## Context

Issue #73 Decisions 74-75 require HestivaOS to distinguish the Technician's factual in-service scope/condition mismatch from the management/commercial decision that follows. ADR-0045 already makes the frozen Execution Scope authoritative once work starts and already permits field outcomes with reason `SCOPE_OR_CONDITION_MISMATCH`.

A second mismatch-reporting system would duplicate field truth, while rewriting the frozen scope would corrupt historical execution truth.

## Decision

HestivaOS will reuse the existing Technician outcome event as the authoritative mismatch report and attach append-only management resolution history to that event.

- Technician authority stops at reporting the mismatch, note and evidence.
- ADMIN records the management resolution.
- Resolution values are controlled: no change required, non-chargeable adjustment, chargeable additional work, or decline additional work.
- Chargeable additional work cannot be treated as authorized until capacity has been reviewed and customer approval has been recorded.
- Customer approval method/time may be recorded as evidence of an externally obtained approval, but this slice does not send correspondence itself.
- A proposed amount is operational/commercial review data only; it is not a Finance obligation or payment state.
- The original frozen Execution Scope remains unchanged.
- Management resolution records are append-only and idempotent through a stable operation UUID and request hash.

## Consequences

The Work Order detail can show field mismatch evidence and management resolution without weakening Technician history. Later Finance can consume an approved proposed amount and later Customer Correspondence can own outbound approval/confirmation messages without either domain becoming the Work Order source of truth.

Phase 2C interrupted visits and Phase 2D replacement visits remain separate workflows.
