# Slice 5M floor-size bands

## Status

Approved shared Website ↔ HestivaOS quote-contract and reusable Property vocabulary.

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

## Persistence compatibility

The reusable `Property.floorSize` enum now supports all of the new precise bands **additively**. The historical broad enum values remain in the database and Prisma schema solely so existing Property records stay readable and editable without destructive inference.

No existing broad value is automatically converted to a narrower band. For example, an existing `FROM_80_TO_150` record cannot truthfully be changed to `FROM_80_TO_99`, `FROM_100_TO_129`, or `FROM_130_TO_169` without new evidence about the property.

For new Property entries, the HestivaOS UI presents only the precise bands plus `Not sure`. When an existing Property carries a historical broad value, that value remains visible as a labelled legacy option during editing until an administrator has reliable information to replace it. Work-order property snapshots can display both the new precise values and historical broad values with explicit legacy labels.
