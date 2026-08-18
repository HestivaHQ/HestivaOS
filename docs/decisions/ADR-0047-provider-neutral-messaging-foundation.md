# ADR-0047: Establish a provider-neutral messaging foundation before live Meta integration

## Status

Accepted — 2026-08-18

Coordination source: `HestivaHQ/HestivaOS#116`.

## Context

Homent intends to accept customer conversations through WhatsApp and Facebook Messenger while preserving HestivaOS as the authoritative system for Customers, Properties, Quotes, pricing, Work Orders, recurring services, payments, and job execution.

A direct implementation against one Meta webhook shape would risk creating a WhatsApp-specific business layer, provider-coupled conversation state, duplicate Quote semantics, and unsafe replay handling. It would also pressure the system to commit message-retention and cross-channel identity rules before those privacy and operational decisions are approved.

The existing Website Quote ingestion boundary is intentionally website-specific. Messaging must reuse the Quote domain without impersonating `HESTIVA_WEBSITE` or reusing the Website integration credential.

## Decision

HestivaOS will establish a provider-neutral messaging contract before adding live WhatsApp or Messenger traffic.

The foundation will:

- represent WhatsApp and Messenger as channel adapters around shared messaging logic;
- keep provider-scoped identity separate from canonical Customer identity;
- normalize inbound events before business processing;
- preserve provider event/message IDs and optional attribution as provenance;
- derive a deterministic non-PII provider-event idempotency key;
- make human review a first-class channel-neutral conversation phase;
- prohibit provider adapters and later AI layers from deciding authoritative business state;
- keep the Website integration boundary separate;
- defer live Quote submission until a safe internal Quote application-service boundary is identified/extracted;
- defer Prisma persistence until retention, PII, media, concurrency, and canonical link semantics are approved.

Foundation v1 therefore introduces TypeScript contracts, adapter interfaces, idempotency primitives, tests, and durable documentation only. It adds no live webhook, provider credential, Meta API call, Prisma model, migration, AI provider, or customer-facing automation.

## Consequences

### Positive

- WhatsApp and Messenger can share one business/conversation layer.
- Meta payload changes remain isolated to provider adapters.
- Provider retries have a defined replay identity before consequential actions exist.
- Customer identity remains under HestivaOS deterministic resolution rules.
- The Website integration remains stable and cannot accidentally become the generic messaging transport.
- Privacy-sensitive persistence decisions can be approved explicitly before schema becomes durable.

### Trade-offs

- Foundation v1 does not yet persist or process real conversations.
- A later slice must still design the database model and extract/define the internal Quote application-service boundary.
- Provider-specific webhook authentication, permissions, templates, pricing, and onboarding remain unimplemented and must be verified against current Meta documentation.

## Rejected alternatives

### Build separate WhatsApp and Messenger bots

Rejected because business logic, state, identity, and Quote behavior would drift between channels.

### Route messaging through the Website Quote ingestion endpoint

Rejected because that boundary has Website-specific provenance, authentication, versioning, and transport semantics. Messaging must not forge Website identity or reuse its credential.

### Add conversation tables immediately

Rejected for Foundation v1 because message retention, raw payload storage, PII/redaction, media ownership, and cross-channel identity semantics are not yet approved. Premature schema would convert unresolved privacy/product choices into durable architecture.

### Make AI the primary conversation controller

Rejected because deterministic structured interaction is cheaper and safer, while HestivaOS must remain authoritative for consequential business decisions.

## Review triggers

Review this decision if:

- a provider requires a fundamentally incompatible delivery model;
- HestivaOS messaging is split into a separately deployable service;
- approved privacy/retention policy requires a different normalized-event boundary;
- the Quote domain exposes a canonical application contract that changes how messaging integration should be expressed;
- a new channel cannot be represented without leaking provider-specific semantics into shared business logic.
