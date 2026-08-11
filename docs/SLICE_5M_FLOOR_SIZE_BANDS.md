# Slice 5M floor-size bands

## Status

Approved shared Website ↔ HestivaOS quote-contract vocabulary.

## Contract values

Website display labels map to the following canonical values:

- `Under 40 m²` → `UNDER_40`
- `40–59 m²` → `FROM_40_TO_59`
- `60–79 m²` → `FROM_60_TO_79`
- `80–99 m²` → `FROM_80_TO_99`
- `100–129 m²` → `FROM_100_TO_129`
- `130–169 m²` → `FROM_130_TO_169`
- `170–219 m²` → `FROM_170_TO_219`
- `220–299 m²` → `FROM_220_TO_299`
- `300+ m²` → `FROM_300_UP`
- `Not sure` → `UNKNOWN`

These values supersede the website-ingestion contract's earlier broad `UNDER_80 / FROM_80_TO_150 / FROM_151_TO_250 / OVER_250` vocabulary. Runtime validation rejects the superseded broad values for new Website Quote Submission Payload v1 material.

`UNKNOWN` remains valid. A future internal address-assisted estimation capability may resolve uncertain floor area, but it is not part of this implementation and must not add a customer-facing step.

## Persistence boundary

This change updates the Website Quote Submission contract used for authoritative Quote ingestion. The existing reusable `Property.floorSize` persistence enum still contains historical broad values and must not be silently converted to narrower bands because that would fabricate precision. A separate additive compatibility migration is required before accepted-quote handoff writes these new precise bands into reusable Property records.
