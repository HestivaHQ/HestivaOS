# ADR-0080: Preserve provider status fidelity separately from generic delivery state

- Status: Accepted
- Date: 2026-08-20
- Coordination: HestivaHQ/HestivaOS#116

## Context

HestivaOS already has provider-neutral message delivery state used for safe retry and business workflow decisions: `PENDING`, `ACCEPTED`, and `FAILED` for outbound messages. The WhatsApp Cloud API also emits provider-specific lifecycle facts such as `sent`, `delivered`, `read`, and `failed` with provider occurrence timestamps.

Collapsing every positive WhatsApp callback into `ACCEPTED` is sufficient for retry safety but loses transport history. Expanding the shared `MessagingDeliveryStatus` enum with WhatsApp-specific vocabulary would make a provider-neutral business/retry contract depend on Meta terminology and would force future providers to emulate states they may not expose.

## Decision

Keep `MessagingMessageStatusEvent` as the provider-neutral delivery/retry history. Positive authenticated WhatsApp status evidence continues to reconcile the generic message state to `ACCEPTED`; explicit provider failure continues to reconcile it to `FAILED`.

Add append-only `MessagingProviderStatusEvent` history for exact provider lifecycle evidence. Each event stores:

- the canonical HestivaOS message identity;
- normalized provider name;
- provider message identity;
- exact normalized provider status;
- provider occurrence timestamp;
- server creation timestamp.

For WhatsApp v1, allowed normalized statuses are produced by the authenticated adapter as `sent`, `delivered`, `read`, or `failed`. Provider-status replay is idempotent on `(provider, providerMessageId, providerStatus, occurredAt)`.

Provider-specific status history is observational evidence. It does not independently authorize a resend, Quote action, booking action, payment action, or any other business mutation. Existing generic reconciliation remains the authority for retry safety and Work Order access-recovery send state.

## Consequences

- HestivaOS can preserve exact WhatsApp delivery/read history without contaminating the provider-neutral delivery enum.
- Lost or out-of-order provider callbacks remain truthful: only the statuses actually received are recorded; missing intermediate states are not fabricated.
- A `delivered` or `read` callback is still sufficient positive evidence to reconcile an ambiguous send to generic `ACCEPTED` and unblock safe read/reconciliation behavior without resending.
- Provider timestamps are retained separately from server ingestion timestamps.
- Future Messenger or other provider adapters may reuse the same provider-status event model with their own normalized provider vocabulary while preserving the shared generic delivery contract.

## Alternatives considered

### Add `SENT`, `DELIVERED`, and `READ` to `MessagingDeliveryStatus`

Rejected because the enum is used as a provider-neutral retry/business boundary. Meta-specific transport vocabulary should not become mandatory shared-domain vocabulary.

### Keep only generic `ACCEPTED` / `FAILED`

Rejected because it discards useful delivery/read evidence required for operational support and later analytics.

### Mutate one current-status column

Rejected because messaging history is append-only and replay/audit requirements need the actual event sequence rather than only the latest state.

## Review triggers

Review this decision if provider-specific lifecycle states begin driving consequential business behavior, if retention requirements for read/delivery telemetry diverge from message-history retention, or if a shared cross-provider status vocabulary becomes genuinely stable enough to replace provider-specific evidence without loss.
