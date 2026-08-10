# ADR-0025: Preserve ambiguous Property states during quote vocabulary alignment

- **Status:** Accepted
- **Date:** 2026-08-10

## Decision

Add nullable exact-vocabulary Property enums while retaining deployed `isEstateOrComplex` and `StoreyCount.THREE_PLUS` compatibility states. Do not backfill ambiguous true or 3+ values. New UI writes exact classifications and storeys; authorized reads expose legacy states until manually enriched. Use one `unitFloor` column with backend-enforced Apartment and Townhouse subsets.

## Consequences

The migration is non-destructive and does not fabricate facts. The legacy boolean and enum member are temporarily visible in code/data, but new exact inputs do not use them. A later cleanup requires authoritative enrichment and a separate superseding decision.
