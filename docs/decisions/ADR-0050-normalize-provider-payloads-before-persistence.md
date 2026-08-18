# ADR-0050: Normalize provider payloads before persistence

## Status

Accepted — 2026-08-18

Coordination source: `HestivaHQ/HestivaOS#116`.

## Context

Messaging Foundation v1 already places WhatsApp and Messenger behind provider adapters that verify authenticity and normalize provider events before business processing. HestivaOS needs durable message/event information for replay protection, conversation history, attribution, delivery state, and later Quote/customer workflows, but complete Meta webhook payloads may contain provider-specific fields and customer information that Homent does not need to operate the business.

Keeping raw webhook JSON as normal durable storage would duplicate data, increase privacy and retention complexity, and couple HestivaOS persistence to Meta payload structure.

## Decision

HestivaOS messaging will persist normalized provider-neutral information rather than complete raw Meta webhook payload JSON.

Provider adapters will:

1. verify provider authenticity using the approved provider mechanism;
2. normalize the event into Homent messaging concepts;
3. preserve the provider identities and facts required for reliable processing, including provider event/message/conversation identifiers where supplied, timestamps, channel/provider identity, message type/content or structured interaction/media references, relevant delivery/status facts, idempotency/provenance fields, and provider-supplied referral/click attribution where applicable;
4. discard the original provider webhook body after successful verification, normalization, and processing.

If a future provider field becomes operationally necessary, it should be deliberately added to the normalized contract and documentation rather than retaining arbitrary provider JSON.

A later separately approved security/forensics requirement may introduce narrowly scoped temporary raw-payload retention, but that is not part of the current messaging architecture and must not be assumed.

## Consequences

### Positive

- HestivaOS stores Homent concepts rather than Meta transport structure.
- Less unnecessary customer/provider data is retained.
- Privacy, retention, storage, and migration obligations are simpler.
- Meta payload evolution remains isolated to provider adapters.
- Required replay, provenance, attribution, and delivery facts remain durable.

### Trade-offs

- Deep debugging cannot rely on a permanently stored copy of the original webhook JSON.
- Newly useful provider fields must be intentionally added to the normalized contract before they become durable.

## Rejected alternatives

### Persist every raw Meta webhook

Rejected because it retains unnecessary provider/customer data, increases privacy and retention complexity, and couples durable HestivaOS state to Meta payload shape.

### Persist normalized data plus raw payloads by default for a short period

Not selected for the current foundation because no verified security or operational requirement justifies the extra sensitive-data lifecycle. This may be reconsidered only if a concrete requirement appears.

## Review triggers

Review this decision if:

- a verified provider dispute/reconciliation requirement cannot be satisfied by normalized identifiers and provenance;
- a security/forensics requirement explicitly requires temporary original payload retention;
- Meta requires retention of signed source material for a specific supported workflow;
- the normalized contract demonstrably loses information required for reliable customer or operational processing.
