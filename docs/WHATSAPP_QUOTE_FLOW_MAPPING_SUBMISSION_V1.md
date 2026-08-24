# WhatsApp Quote Flow V1 mapping and submission

## Status

**IMPLEMENTED by the Step 5 PR when merged.** This document describes the production-code boundary from an authenticated, durable Step 4 `COMPLETED` Flow session to canonical HestivaOS Quote submission or Flow-session human review. The production Meta Flow artifact is still not published by this slice, and Flow PhotoPicker secure retrieval remains deferred.

Coordination source: `HestivaHQ/HestivaOS#116`. Governing decisions: ADR-0049, ADR-0052, ADR-0081 and ADR-0088.

## Frozen V1 parser

`whatsapp-quote-flow-v1-mapper.ts` accepts only a durable completed session bound to `HOMENT_QUOTE_REQUEST_V1`, `HOMENT_QUOTE_REQUEST_MAPPING_V1`, `HOMENT_QUOTE_REQUEST_COMPLETION_V1`, Flow JSON `7.3`, the launch-time provider Flow artifact, and immutable completion fingerprint/evidence. It maps only stable machine field IDs from the frozen contract. Customer-facing labels are not parser authority.

The parser treats completion response data as untrusted client input. It rejects unknown business fields, missing required facts, unsupported options through mapping/canonical validation, malformed quantities, contradictory service-specific frequency fields, apartment/non-apartment hidden-field contradictions, Post-Event stray fields, add-on quantity contradictions, ineligible Laundry/Ironing, pet-detail contradictions, key-handover contradictions, safety-detail contradictions, and incompatible contract/mapping/completion versions. The resulting draft is revalidated by the existing channel-neutral `validateQuoteBusinessFacts()` boundary.

The mapper projects the same canonical `MessagingQuoteDraft` groups used by guided Messaging: customer, property, request, visit, access, household, safety, notes and photos. It does not create a Flow-specific Quote schema or pricing vocabulary. Existing Quote v2 validation, Laundry eligibility, Post-Event facts and Quote-domain pricing remain authoritative.

## Flow confirmation origin

The Flow path does not create a synthetic inbound `CONFIRM` message and does not weaken guided confirmation. Guided WhatsApp fallback and Messenger retain durable review-summary plus exact inbound `CONFIRM` semantics.

For Flow, the legitimate confirmation origin is the authenticated completed Flow session itself: exact frozen contract/version binding plus immutable completion evidence. Quote structured provenance records `confirmationOrigin = WHATSAPP_FLOW`, the Flow session ID, contract/mapping/completion versions, provider Flow artifact/version and completion fingerprint.

## Submission identity and replay

The Flow submission key is deterministic from the durable Flow session ID and immutable completion fingerprint and uses a distinct `messaging-flow:` namespace. It does not reuse Website submission IDs or Website provenance.

The session reserves that submission key before authoritative Quote creation. `QuoteSubmissionService` remains the only Quote creation/pricing boundary, and `resolveMessagingQuoteReplay()` compares immutable structured submission data. Duplicate delivery of the same valid completion therefore converges on the same submission identity and Quote. Conflicting immutable data fails closed.

The Step 5 migration adds nullable `submission_key`, `submitted_quote_id`, `human_review_reason` and `processed_at` fields to the existing Flow session table. The submission key and Quote linkage are unique when present. A session already linked to a canonical Quote returns that Quote on replay and cannot be linked to a different Quote.

## HUMAN_REVIEW

Unsafe completed Flow data does not receive invented business facts or pricing. `NOT_SURE`, unresolved PhotoPicker evidence, malformed/contradictory V1 submissions and other mapping/validation failures are recorded as a durable Flow-session human-review reason. Replay returns the same review outcome instead of creating a duplicate Quote.

The existing canonical Quote domain may also create a Quote in `NEEDS_ATTENTION` when its authoritative operational-cost/pricing safeguards require review. Step 5 does not bypass or duplicate those safeguards.

## Photos

An omitted or empty V1 PhotoPicker result maps to canonical `photos: []`. If completion indicates PhotoPicker evidence is present, Step 5 does not fabricate `QuotePhoto`, persist a public Meta URL, or silently treat the request as no-photo. It records HUMAN_REVIEW until the dedicated Flow PhotoPicker retrieval/decryption/verification/private-storage lifecycle is implemented under ADR-0081.

PR #214 remains separate and untouched. It concerns secured ordinary inbound WhatsApp media, not Flow PhotoPicker completion media.

## Customer and Property authority

Flow customer/property values are customer-supplied Quote facts only. Step 5 does not create or overwrite canonical Customer or Property records and does not treat WhatsApp provider identity as Customer identity. Existing accepted-Quote conversion and deterministic match/review boundaries remain unchanged.

## Normal chat and fallback

Step 4 ownership remains unchanged. While a Flow is unresolved, ordinary WhatsApp chat remains help/conversation and does not mutate the guided Quote draft. Guided collection becomes answer-active only after deliberate `FALLBACK`. Messenger and guided WhatsApp submission continue through their existing confirmation model.

## Deferred

This slice does not implement Flow PhotoPicker retrieval, production Flow JSON publication, provider health polling, AI, quote-delivery/view tracking, accounting/ERP work, or general chat AI. Those remain later reviewed slices.
