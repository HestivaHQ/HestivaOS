# ADR-0027: Authoritative Quote domain in HestivaOS

- **Status:** Accepted
- **Date:** 2026-08-11
- **Decision owners:** Hestiva
- **Related coordination:** HestivaOS Issue #73 — Slice 5M Website ↔ HestivaOS Integration Contract

## Context

The public Hestiva website currently captures quote enquiries primarily for email presentation. Slice 5M requires a durable operational handoff into HestivaOS, while future channels such as manual/Admin capture and WhatsApp must converge on the same business workflow. Maintaining independent quote identities, pricing logic, histories, or lifecycle state in each channel would create reconciliation risk and duplicate business rules.

The accepted Slice 5M product decisions establish that HestivaOS owns the official quote reference, quote record, pricing calculation, pricing snapshot, revision history, commercial status, quote-photo provenance, and eventual links into Customer, Property, Recurring Service Agreement, and Work Order workflows. The website remains a customer-facing capture/presentation channel rather than a second authoritative quote database. Safe retries are also an explicit contract requirement: a timeout or repeated delivery must not create duplicate Quotes or duplicate photo records.

## Decision

HestivaOS owns an explicit Quote aggregate.

The foundation consists of:

- `Quote` as the stable commercial identity, with unique public reference, required database-unique submission idempotency key, commercial status, 30-day validity boundary, current revision number, and nullable future operational-link identifiers;
- `QuoteRevision` as an immutable structured-data and pricing snapshot for each customer submission/Admin revision;
- `QuoteLineItem` as the immutable minor-unit pricing breakdown with quantities, unit values, and line totals;
- `QuotePhoto` as durable quote evidence/provenance with a required database-unique transfer idempotency key, customer/Admin source, and transfer status;
- `QuoteActivity` as append-only quote-domain audit history;
- `QuoteDailyCounter` as the atomic sequence primitive for the approved `Q-YYYYMMDD-####` reference family.

`Quote.submissionKey` is distinct from the public Quote reference. It identifies one logical incoming Quote creation attempt across transport retries. `QuotePhoto.transferKey` identifies one logical photo transfer across retries. Later service-layer code must reuse each original key rather than minting a new key after a timeout or transient failure. Database uniqueness is the final duplicate-prevention boundary; the API behavior that resolves an existing row for a repeated key is implemented in a later Slice 5M sub-slice.

Submitted pricing is stored in integer minor currency units with `ZAR` as the initial currency. Tax/VAT fields exist in the internal snapshot but default disabled/zero; customer-facing VAT presentation is not enabled by this foundation.

A Quote keeps one stable public reference across revisions. Revision identity is separate and monotonically numbered per Quote. Only later service-layer work will enforce current-revision acceptance, calculate references/prices, create operational records, and implement Accept/Decline security.

Customer/Property/Work Order/Recurring Agreement identifiers are nullable scalar linkage slots in this foundation rather than foreign-key relations. The actual accepted-quote orchestration and ownership checks belong to later Slice 5M implementation, avoiding premature coupling while preserving the intended integration points.

## Consequences

### Positive

- Website, Admin/manual capture, and future WhatsApp integration can converge on one canonical Quote model.
- Historical quotes and revisions remain auditable even after pricing rules change.
- Replayed Quote submissions and photo transfers have durable database identities that prevent duplicate records once the service layer uses them.
- Pricing breakdowns are structurally ready for later invoice/QuickBooks integration without making QuickBooks a launch dependency.
- Customer quote photos remain distinguishable from operational Before/During/After job media.
- Retry/failure states have an explicit durable place (`NEEDS_ATTENTION`, photo transfer statuses, activities) instead of being inferred from email delivery.

### Trade-offs

- The Quote domain adds new tables and lifecycle concepts before the full Slice 5M API/UI is wired.
- Nullable operational linkage identifiers are not yet database-enforced relations; later handoff work must validate them transactionally.
- The structured quote payload schema is stored as JSON in revisions at this foundation stage; the typed website/API contract is defined in the next Slice 5M sub-slice.
- The idempotency keys are stored now, while request authentication, key generation/ownership, retry response semantics, and service-layer conflict handling remain to be implemented with the shared API contract.

## Out of scope for this ADR

- Public website request/response contract and versioning;
- pricing-rule implementation;
- customer/phone matching logic;
- Accept/Decline action-token and authentication flow;
- Work Order/Recurring Agreement creation transaction;
- customer portal or customer-side online acceptance;
- WhatsApp implementation;
- QuickBooks integration.
