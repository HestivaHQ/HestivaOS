# ADR-0028: Versioned website Quote submission contract

- **Status:** Accepted
- **Date:** 2026-08-11
- **Decision owners:** Hestiva
- **Related coordination:** HestivaOS Issue #73
- **Supersedes:** the website email-description string as any future integration source; it does not supersede ADR-0027 Quote-domain ownership.

## Context

Slice 5M-A established HestivaOS as the authoritative Quote domain. The website still submits quote information primarily as presentation text, which is unsuitable for deterministic pricing, idempotent retry, durable photo provenance, or accepted-Quote orchestration. Issue #73 subsequently locked the canonical website payload, server-to-server trust boundary, authoritative pricing response, and photo retry contract.

## Decision

Adopt `schemaVersion: "1.0"` as the first website Quote Submission contract. The website owns capture UX and conversion of displayed labels into the structured document; HestivaOS owns canonical validation, Quote persistence, reference generation, pricing, lifecycle, photo storage, and later operational import.

The payload uses a stable UUID `submissionId`, source `HESTIVA_WEBSITE`, UTC submission time, and explicit customer/property/service/visit/access/household/safety/note/photo structures. Human-readable email prose is presentation only and is never parsed to reconstruct the contract.

The private integration is server-to-server at the approved route `POST /api/integrations/website/quotes`, authenticated by a dedicated server-side bearer secret. Slice 5M-B records the route and validation contract but does not expose an incomplete runtime endpoint before atomic Quote persistence and authoritative pricing can be implemented together.

HestivaOS returns the official `Q-YYYYMMDD-####` identity and an immutable ZAR minor-unit pricing snapshot. The website must not maintain a second authoritative pricing engine.

Photo transfer uses stable `clientPhotoId` plus SHA-256 provenance. Retry of identical content reuses the existing evidence; reuse of a photo ID for different content is a conflict. Quote persistence may survive individual photo-storage failure as `NEEDS_ATTENTION`, but acceptance remains blocked until reconciliation.

## Consequences

- Cross-repository field names and enum meanings are now a versioned contract and cannot change silently.
- Safe retry does not create a second Quote or silently recalculate an already submitted Quote.
- `Add-on Services` and `Not sure` remain explicit review-required pseudo choices rather than fuzzy Service mappings.
- Exact floor 0–50, safety/access facts, add-on quantities, eco-friendly preference, and customer-photo provenance are preserved structurally.
- A later sub-slice must implement the authenticated route, atomic persistence, pricing engine, storage, and replay/conflict behavior before the website can switch production submission to this boundary.

## Versioning

Additive optional fields may remain within v1. Breaking field removal/rename or enum semantic changes require a new major contract version and coordinated implementation in both repositories.
