# ADR-0071: Make HestivaOS Correspondence the authority for immutable template versions

## Status

Accepted — 2026-08-20.

## Context

HestivaOS already owns provider-neutral Messaging conversations and immutable WhatsApp/Messenger message history. That boundary is transport/conversation history, not the authority for business correspondence such as booking confirmations, completion messages, reminders, invoices or receipts.

The roadmap requires a shared Customer Correspondence runtime before broad Messaging or Finance delivery so those domains do not create competing outbound-history models. The first dependency is durable template/version ownership.

## Decision

Create a separate HestivaOS `Correspondence` domain as the provider-neutral authority for business communications.

The first implementation slice will own only template identity and immutable version history:

- `CorrespondenceTemplate` is the stable logical identity, addressed by a durable unique key and human-readable name.
- `CorrespondenceTemplateVersion` is immutable content once published.
- Versions follow `DRAFT -> PUBLISHED -> RETIRED` lifecycle transitions.
- A template may have at most one published version at a time. Publishing a draft retires the previously published version atomically.
- Published or retired content is never edited in place. A content change requires a new draft version.
- ADMIN is the only role permitted to create templates, create versions, publish versions or retire versions initially.
- Template versions store subject/body source text only. No customer-facing template catalogue, wording, tone policy or placeholder vocabulary is invented by this decision.
- The first slice does not send messages, select providers/channels, render customer-specific correspondence, create delivery attempts, schedule triggers or define retry policy.

Future rendered correspondence must reference the exact immutable `CorrespondenceTemplateVersion` used. Future transport adapters consume authorized Correspondence state; they do not become the owner of template/version truth.

## Messaging boundary

`MessagingConversation` and immutable `MessagingMessage` remain the channel/conversation record for WhatsApp and Messenger. Correspondence does not duplicate inbound conversation state or provider message history.

A later integration may link an authorized rendered Correspondence record to Messaging delivery where appropriate, but the business communication and its provenance remain Correspondence-owned while provider transport/status facts remain Messaging/provider-owned.

## Consequences

- Finance can later use the same correspondence authority for invoices/receipts without creating a competing template or outbound-history model.
- WhatsApp/Messenger can later deliver authorized correspondence without owning business wording or trigger decisions.
- Email/provider selection remains deferred.
- Rendered-message history/provenance, delivery attempts/retries/failures, human approval boundaries and event triggers remain separate roadmap slices.

## Review triggers

Revisit this decision only if a future approved requirement needs editable published history, multiple simultaneously active published versions for the same logical template, or a fundamentally different ownership boundary between Correspondence and Messaging.