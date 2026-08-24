# ADR-0088: Use WhatsApp Flow as the primary structured Quote intake

- **Status:** Accepted
- **Date:** 2026-08-24
- **Related coordination:** HestivaOS Issue #116

## Context

HestivaOS already has a provider-neutral Messaging foundation, authenticated direct Meta WhatsApp and Messenger edges, resumable Messaging Quote state, a deterministic guided Quote collector, review/correction handling, and an internal Messaging-to-Quote submission boundary. ADR-0049 remains authoritative that messaging reuses the canonical HestivaOS Quote business facts and validation rather than creating a messaging-only Quote contract. HestivaOS remains the sole authority for Quote validation, pricing, immutable revisions, human-review outcomes and accepted operational conversion.

ADR-0052 established the messaging Quote lifecycle when the customer experience was expected to be conversational: collect a resumable draft, present a text review summary, and require explicit chat confirmation before canonical Quote creation. That remains appropriate for conversational collectors, especially Messenger and WhatsApp fallback. Meta WhatsApp Flows now provide a provider-native structured form presentation that better fits the primary WhatsApp Quote experience while still allowing HestivaOS to retain all business authority.

Provider-contract verification completed before this decision established these constraints:

- a published Flow definition is treated as a versioned deployment artifact rather than mutable current form state;
- completion arrives through authenticated WhatsApp messaging as an interactive Flow reply and can be retried/duplicated by webhook delivery;
- an application-supplied opaque `flow_token` can correlate a launch/session but is not provider authentication by itself;
- unsupported or unhealthy Flow delivery must have a non-Flow fallback;
- unfinished form progress is not guaranteed by the provider contract to survive leaving the Flow, returning to chat, application restart or temporary connectivity loss;
- the provider does not give HestivaOS enough evidence to fabricate durable `STARTED`, `VIEWED` or `ABANDONED` lifecycle facts for a static v1 Flow;
- PhotoPicker is available but has a distinct Flow-media completion/retrieval lifecycle rather than ordinary inbound WhatsApp image semantics.

## Decision

### 1. Channel presentation

WhatsApp Flow is **APPROVED / PLANNED** as the primary structured WhatsApp Quote intake presentation.

The existing deterministic guided WhatsApp collector is **IMPLEMENTED / FALLBACK**. It remains a supported safe path when Flow is unavailable, unhealthy, unsupported by the customer's WhatsApp client, cannot be launched, or the customer is deliberately transitioned to fallback.

The Messenger deterministic guided collector is **IMPLEMENTED** and remains the provider-appropriate conversational Quote path. This ADR does not require a Messenger Flow equivalent.

The explicit WhatsApp fallback direction is:

**WhatsApp Flow -> deterministic guided WhatsApp collector -> Website Quote form where appropriate -> human assistance.**

The customer must not be left at a dead end when a Flow cannot be used.

### 2. Canonical Quote authority is unchanged

ADR-0049 is preserved. Flow is presentation and transport only. It does not create a second Quote schema, pricing engine, Customer authority or business-validation layer.

Completed Flow values must map into the existing canonical HestivaOS Quote business facts and pass the same independent HestivaOS validation and pricing/review boundaries used by Messaging Quote submission. Conditional Flow presentation improves UX only; it never replaces server-side validation.

Provider identity alone does not prove canonical Customer identity. Prefill, if later introduced, must preserve the existing Customer-linking/trust boundary and must not expose private Customer or Property information merely because the same provider identity starts a Flow.

### 3. Flow review and submission supersede only ADR-0052's conversational presentation rule

For the WhatsApp Flow path, the Flow's own versioned Review/Submit completion is the customer submission action. A separate outbound chat review summary followed by exact `CONFIRM` is not required after an authenticated, valid Flow completion.

This supersedes only ADR-0052 decision items 4-5 and their related consequence **for the WhatsApp Flow presentation path**. ADR-0052 remains authoritative for the guided WhatsApp fallback and Messenger conversational collector, and its Customer, Quote-revision, human-review and business-authority decisions remain unchanged.

A Flow completion must still be authenticated at the existing WhatsApp provider edge, correlated to the expected Flow session/version, replay-safe, validated by HestivaOS and converted through the existing authoritative Quote submission boundary. One logical completion must converge on exactly one Quote or HUMAN_REVIEW result.

### 4. Interruption and normal-chat assistance

HestivaOS must not assume unfinished Flow field values survive interruption. An unresolved Flow session may be known to exist, but HestivaOS must not claim knowledge of unsubmitted field progress that Meta has not provided.

A customer may return to ordinary WhatsApp chat while an unresolved Quote Flow session exists and ask for automated or human help. Those ordinary chat messages remain normal conversation/help messages. They must **not** be interpreted as answers to the deterministic guided Quote collector while the Flow session remains active.

The guided collector becomes answer-active only after a deliberate fallback/transition decision. If Meta preserves the customer's unfinished local Flow state, the customer may resume it; if not, the experience must safely restart or transition to fallback without creating a duplicate Quote or conflicting active submission.

### 5. Flow versioning and rollout

Flow definitions are versioned deployment artifacts. Every launch/session and every accepted completion must be durably bound to the exact provider Flow identity/definition and HestivaOS mapping contract that produced it.

A V1 session remains a V1 session after V2 is deployed. Old in-flight sessions must never be silently interpreted against a newer Flow definition or mapping. New versions are validated/tested before becoming customer-facing; published definitions are not treated as mutable in-place application forms.

The exact session schema, persistence fields and rollout mechanics are deferred to the implementation slice. This ADR establishes the required invariants, not a database shape.

### 6. Evidence-based Flow lifecycle

Persist only lifecycle facts HestivaOS can prove from local/provider evidence. Examples may include a locally/provider-accepted offer/send, an authenticated completion, a definite provider failure, and a local expiry/supersession decision where implemented.

Do not invent `STARTED`, `VIEWED`, `ABANDONED` or equivalent customer-behaviour events merely because a Flow was offered or time passed. If future provider capabilities expose stronger trustworthy lifecycle evidence, add it deliberately without rewriting historical events.

### 7. Conditional presentation and contextual help

The Flow should use concise in-Flow explanatory text for fields likely to confuse customers and conditional presentation so customers see only relevant questions. Examples include property-specific floor/storey questions, pet details, custom-frequency details, service-description fields and add-on follow-ups.

These are presentation rules only. HestivaOS independently validates the completed canonical facts.

### 8. PhotoPicker is optional and independently disableable

PhotoPicker is **PLANNED / OPTIONAL** Quote evidence capture. Failure, provider regression or temporary disablement of PhotoPicker must not disable the core Quote Flow.

Flow PhotoPicker media is not ordinary inbound WhatsApp image media. Its provider-media retrieval/decryption/verification path must be handled according to the verified Flow media contract before becoming canonical Quote evidence.

ADR-0081's principles are preserved: provider temporary media locations are not durable storage, customer media remains private, immutable message history is not rewritten with later media-processing state, replay must not duplicate logical assets, and canonical Quote evidence remains Quote-owned rather than a second permanent Messaging media library.

### 9. Health, release safety and fallback

A production Flow must pass provider schema validation, draft/preview testing, HestivaOS mapping tests, current-client testing, fallback tests and submission replay/idempotency tests before it becomes the primary customer-facing version.

Where provider health/status information is available, the launch boundary should use it conservatively. A known unavailable, unhealthy, unsupported or definitely failed Flow must route toward the explicit fallback chain rather than leaving the customer blocked.

### 10. Keep v1 bounded

The first production Flow should be static/simple where practical. Do not add AI, live pricing, unnecessary `data_exchange` calls or complicated dynamic backend behavior merely because Meta Flows can support them.

The v1 objective is one reliable WhatsApp Quote Flow -> canonical HestivaOS validation -> exactly one Quote or HUMAN_REVIEW result.

## Consequences

### Positive

- WhatsApp gets a structured form experience without duplicating HestivaOS Quote rules.
- Messenger retains the conversational experience appropriate to that provider.
- The already-implemented deterministic WhatsApp collector remains useful as a safe fallback rather than being discarded.
- Customer questions can be handled in normal chat without corrupting Flow state or being mistaken for fallback answers.
- Flow rollout can evolve from V1 to V2 without silently changing the meaning of in-flight submissions.
- Photo evidence can be enabled independently of the core Flow's production readiness.

### Trade-offs

- HestivaOS needs a durable Flow-session/version correlation boundary before Flow can become live.
- An interrupted static Flow may require restart because unfinished client-side field progress is not assumed durable.
- WhatsApp now has two Quote presentations that must deliberately transition between one another rather than running as competing collectors.
- Real-device/provider validation is part of release safety, especially for PhotoPicker and unsupported-client fallback.

## Preserved decisions

This ADR does **not** supersede:

- ADR-0049's canonical Quote-contract reuse, retention and HestivaOS authority decisions;
- ADR-0052's Customer-creation, submitted-Quote revision, HUMAN_REVIEW and conversational guided-collector decisions;
- ADR-0081's private provider-media security and immutable-history principles;
- the existing WhatsApp webhook-authentication, provider-status, retry/idempotency or deliberate Customer-linking ADRs.

## Deferred

This ADR does not implement or freeze:

- the Flow/session database schema;
- production Flow JSON or field identifiers;
- the exact Flow health-cache/check cadence;
- PhotoPicker media retrieval code;
- private-data prefill policy beyond the existing identity/trust boundary;
- AI interpretation, live pricing or dynamic Flow backend behavior.

## Review triggers

Review this decision if Meta materially changes Flow publication/version semantics, interruption/resume guarantees, completion authenticity/payload behavior, client support, PhotoPicker media lifecycle, or health/status capabilities; or if the authoritative HestivaOS Quote contract changes materially.