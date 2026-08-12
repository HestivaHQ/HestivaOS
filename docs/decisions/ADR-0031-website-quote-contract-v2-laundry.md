# ADR-0031: Version Website Quote contract for structured Laundry

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

Website Quote contract v1 predates the approved Laundry operating model. Generic add-on labels cannot safely carry laundry facilities, requested load quantities, or the distinction between Laundry and Ironing. Reconstructing those values from display text would be lossy and would violate the integration rule that unresolved mappings fail closed.

## Decision

Define Website Quote contract v2 (`schemaVersion: 2.0`) as an additive successor to v1.

- Unchanged v1 customer/property/visit/access/safety/photo fields retain their established validation.
- Laundry and Ironing move to structured `request.laundry` fields.
- The website sends facilities and requested load quantities; HestivaOS derives Wash, Dry & Fold vs Wash & Hang.
- Generic `request.addOns` must not contain Laundry, legacy Laundry Folding, or Ironing in v2.
- Eligibility and per-load pricing use the authoritative HestivaOS Laundry policy.
- Runtime transport must not switch to v2 until the website sender and accepted-operation quantity persistence are both non-lossy.

## Consequences

Contract v1 remains historically valid for existing integrations/replay identities. v2 is not a silent mutation of v1.

A deployment may support v1 and v2 concurrently during migration, but new Laundry/Ironing submissions must use v2 once the structured integration is activated.

## Review triggers

Review this ADR if Laundry facilities/outcomes change, quantity semantics change, off-site laundry is introduced, or the quote contract receives a broader versioning redesign.
