# Work Order Access Recovery v1

Status: Phase 3D implemented on 2026-08-19.

## Boundary and eligibility

Phase 3D extends the provider-neutral messaging foundation for one bounded purpose: an ADMIN may request missing visit access information through an already configured, Customer-linked WhatsApp or Facebook Messenger conversation. Eligibility is derived from an active Work Order, canonical unresolved Phase 3A–3C readiness (`REQUIRED_MISSING`, `NEEDS_REVIEW`, or `EXPIRED`), and at least one configured canonical conversation/provider adapter. `RECEIVED`, `ARRANGED_ANOTHER_WAY`, and `NOT_REQUIRED` are excluded. No countdown or second access state is stored.

The API returns only available constrained conversation choices. Provider identity stays private and is never treated as Customer identity. No provider adapter is configured by this package; availability appears only where the canonical integration has registered an adapter and linked a conversation to the Customer.

## Human-triggered outbound request

`POST /api/v1/work-orders/:id/access-recovery` is ADMIN-only and requires a UUID request identity plus one returned conversation ID. The provider-neutral outbound record has purpose `WORK_ORDER_ACCESS_RECOVERY`; the adapter receives the same stable idempotency key on retries. Customer wording asks only for access information for the upcoming visit and excludes credential echoes, internal identifiers, Needs Attention priority, notes, Finance, and lifecycle commitments. There is no automatic send from readiness, appointment distance, priority, credential expiry, or webhook processing.

`GET /api/v1/work-orders/:id/access-recovery` returns safe eligibility, channels, delivery state, and whether a linked response requires review. It does not return message bodies, provider identity, private paths, credential values, or attachments.

## Inbound review and protected provenance

Authenticated provider adapters normalize inbound events; the canonical messaging service preserves the message and provider-event replay identity. The first subsequent response on the same conversation is linked to the latest sent recovery and surfaced as `RESPONSE_REQUIRES_REVIEW`. Arrival does not change access readiness or create a credential.

An ADMIN may explicitly register the linked response through `POST /api/v1/work-orders/:id/access-recovery/:recoveryId/credential-candidate`. The command rejects cross-Work-Order correlation and stale access facts, then uses the Phase 3B encrypted/private credential service with unique source-message provenance. The resulting credential remains `PENDING_REVIEW`; the existing separate ADMIN review action is required before it can become usable. Replays return the same credential. Original messaging content remains preserved. Private attachments are eligible only after the provider integration has secured them under the existing Work-Order-scoped Phase 3B private path; extraction metadata is supplementary.

## Isolation

The stable `work-order:<id>:access-required` Needs Attention condition remains the only access alert and continues to resolve solely from Phase 3A–3C facts/usability. Recovery adds no Technician fields, general inbox, workflow engine, autonomous correspondence, scheduling/assignment/execution/lifecycle action, or Finance behavior.
