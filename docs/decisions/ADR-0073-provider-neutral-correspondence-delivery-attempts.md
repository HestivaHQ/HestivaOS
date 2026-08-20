# ADR-0073: Persist provider-neutral Correspondence delivery attempts as append-only chains

## Status

Accepted — 2026-08-20.

## Context

ADR-0071 makes HestivaOS Correspondence authoritative for immutable template versions. ADR-0072 adds immutable rendered `CorrespondenceRecord` history and explicitly separates materialized business content from delivery.

The next dependency-ready Phase 2 slice is delivery-attempt, retry and failure state. Provider/channel selection, live sending, automatic retry timing and provider-specific safe-retry semantics remain unresolved. Messaging separately owns WhatsApp/Messenger conversation and provider-message history.

A delivery foundation therefore needs to preserve exact outbound-attempt history without implying that HestivaOS has selected or contacted a provider.

## Decision

Add provider-neutral append-only delivery state owned by Correspondence.

A `CorrespondenceDeliveryAttempt`:

- references exactly one immutable `CorrespondenceRecord`;
- has a monotonically increasing attempt number scoped to that record;
- stores an opaque route snapshot supplied by the caller instead of introducing a canonical provider/channel enum;
- optionally references exactly one previous failed attempt, forming a linear retry chain;
- is never updated or deleted through the API.

Each attempt has append-only `CorrespondenceDeliveryAttemptEvent` history using the provider-neutral statuses `PENDING`, `ACCEPTED` and `FAILED`.

Creating an attempt atomically creates its initial `PENDING` event. Recording an outcome appends exactly one terminal `ACCEPTED` or `FAILED` event. A terminal attempt cannot receive another outcome.

A retry:

- is represented by a new attempt rather than mutating the failed attempt;
- may be created only from the latest terminal `FAILED` attempt for the same Correspondence record;
- cannot branch from one failed attempt into multiple retry attempts;
- cannot be created from `PENDING` or `ACCEPTED` state;
- has no automatic schedule or universal retry interval in this decision.

The database enforces a single first attempt per Correspondence record, unique attempt numbers, one successor per previous attempt, one initial `PENDING` event and at most one terminal event per attempt.

Provider references, failure codes/messages and other provider/runtime details are immutable event snapshots. They are not treated as Correspondence business truth outside the attempt history.

## No-send boundary

This decision creates state APIs only. It does not call a transport provider, choose an email/Meta service, authorize customer sending, schedule retries, decide retry delays, or guarantee that `ACCEPTED` means delivered to the final recipient.

`ACCEPTED` means only that the future delivery adapter reports the attempt as accepted at its boundary. Provider-specific delivery/read/status facts remain provider/adapter facts and, for WhatsApp/Messenger, must continue to respect the existing Messaging ownership boundary.

Before any future adapter creates a retry, that adapter must apply the provider's approved safe-retry semantics and establish that retrying will not knowingly duplicate a successful transaction.

## Authorization

Delivery-attempt state management and history reads remain ADMIN-only initially, matching the current Correspondence management/history boundary. Broader automation or role access requires a later explicit authorization decision.

## Consequences

- Failed sends and retries remain auditable without rewriting history.
- Provider choice can change without changing the Correspondence persistence model.
- A future adapter can record attempts while immutable `CorrespondenceRecord` content remains unchanged.
- Duplicate retry branches are blocked at both application and database boundaries.
- Automatic retry policy and provider integration remain separate decisions rather than being smuggled into persistence.

## Review triggers

Revisit this decision when a live provider adapter is approved, when asynchronous provider callbacks require richer state, when provider-specific idempotency keys become canonical requirements, or when non-ADMIN automation/roles are authorized to create delivery attempts.