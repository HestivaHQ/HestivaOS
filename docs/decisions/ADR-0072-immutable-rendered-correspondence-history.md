# ADR-0072: Persist rendered correspondence as immutable provider-neutral history

## Status

Accepted — 2026-08-20.

## Context

ADR-0071 establishes HestivaOS Correspondence as the authority for business communication definitions and immutable template versions. The next dependency-ready roadmap slice is rendered-message history and provenance, before provider-specific delivery or Finance integration can safely build on Correspondence.

Placeholder syntax, customer-facing template wording, transport channels/providers, delivery attempts, retries, triggers and human-approval policy are still deliberately unapproved or deferred.

## Decision

Introduce append-only `CorrespondenceRecord` history owned by the Correspondence domain.

Each record must:

- reference the exact published `CorrespondenceTemplateVersion` used;
- snapshot the template machine key and version number for durable provenance;
- persist the exact rendered subject/body that downstream delivery will later consume;
- persist an opaque recipient snapshot supplied by the caller;
- persist opaque business provenance plus a server-stamped materializing-actor identity snapshot;
- be created only from a currently `PUBLISHED` template version;
- be readable through a bounded ADMIN-only history API initially;
- have no update or delete API.

Because placeholder/merge-field semantics are not yet approved, the v1 materializer performs no substitution. It copies the published template version subject/body verbatim into the immutable record. Later rendering semantics must preserve the invariant that the persisted record is the exact content authorized for downstream delivery and remains anchored to the exact immutable template version.

The database uses restrictive deletion semantics from rendered history to the template version so provenance cannot be cascaded away.

## Boundary with delivery

A `CorrespondenceRecord` is not a delivery attempt and does not imply that a customer message was sent. Provider/channel selection, retries, failures, provider identifiers and delivery status belong to the next delivery-attempt slice.

Messaging remains authoritative for WhatsApp/Messenger provider conversation/message facts. A future delivery adapter may link a Correspondence record to Messaging or another provider-specific attempt, but must not rewrite the Correspondence record.

## Consequences

- Finance, Messaging and operational events can later share one immutable outbound-content provenance boundary.
- Delivery can be retried without changing what was originally materialized.
- Provider changes do not alter historical business communication content.
- Placeholder vocabulary and dynamic rendering remain deferred rather than being invented implicitly by persistence.

## Review triggers

Revisit this decision if approved rendering needs multiple output parts/attachments, regulated retention requires redaction or cryptographic sealing, or non-ADMIN history access is introduced.