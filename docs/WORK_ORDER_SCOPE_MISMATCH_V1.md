# Work Order Scope Mismatch / Additional Work v1

Status: Phase 2B implementation contract.
Date: 2026-08-18
Coordination: Issue #127, Issue #73 Decisions 74-75.

## Purpose

Phase 2B adds the management-side resolution workflow for in-service scope or condition mismatches without creating a second Technician reporting system and without mutating the frozen Execution Scope.

Technician field truth remains the existing `ExecutionSectionOutcomeEvent` with reason `SCOPE_OR_CONDITION_MISMATCH`, note, field timestamp, Technician identity, attention level, section identity and linked evidence. Management resolution is append-only history layered on top of that field fact.

## Authority

Technicians may report the mismatch and capture evidence. They do not set prices, promise chargeable extra work, or alter the original frozen scope.

ADMIN is the authority that records the management resolution. The controlled resolution values are:

- `NO_CHANGE_REQUIRED`
- `NON_CHARGEABLE_ADJUSTMENT`
- `CHARGEABLE_ADDITIONAL_WORK`
- `DECLINE_ADDITIONAL_WORK`

Customer approval state is controlled as `NOT_REQUIRED`, `PENDING`, `APPROVED`, or `DECLINED`. When approval is recorded as approved, the method is one of `PHONE`, `WHATSAPP`, `EMAIL`, `IN_PERSON`, or `OTHER`, with a valid approval timestamp.

## Chargeable additional work gate

Chargeable additional work requires all of the following before `additionalWorkMayBegin` is true:

1. a positive proposed amount in minor currency units;
2. explicit capacity review;
3. customer approval status `APPROVED`;
4. recorded approval method and approval time.

The proposed amount is not a Finance obligation, invoice, payment, clearance state, charge, credit, or refund. Finance remains a later canonical runtime.

## Frozen scope and history

The Work Order's started Execution Scope remains immutable historical truth. Phase 2B does not rewrite the original checklist or booked scope after work has started. The management decision is stored as a separate append-only resolution record tied to the authoritative mismatch outcome event.

Each resolution uses a client-generated stable operation UUID and request hash. Replaying the same operation with the same payload returns the existing resolution; reusing the operation UUID for a different decision is rejected.

## API

- `GET /work-orders/:id/scope-mismatches` — management read view of authoritative mismatch events, evidence and resolution history.
- `POST /work-orders/:id/scope-mismatches/:eventId/resolve` — ADMIN-only controlled resolution action.

The Work Order detail Admin UI presents controlled resolution, approval method/status, capacity review and amount inputs rather than free-form workflow values.

## Boundaries

- No Finance state is created or changed.
- No customer email, SMS, WhatsApp or Messenger is sent.
- No Technician scope event is rewritten.
- No Work Order frozen Execution Scope is rewritten.
- Phase 2C interrupted/unable-to-complete and Phase 2D replacement visits remain separate slices.
