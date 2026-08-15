# Website Quote Contract v2 frequency update — 2026-08-15

## Decision

Contract v2 accepts the full existing Website frequency vocabulary for these canonical primary services:

- Bedroom Cleaning
- Living Area Cleaning

Allowed values are:

- `ONE_TIME`
- `WEEKLY`
- `EVERY_TWO_WEEKS`
- `MONTHLY`
- `CUSTOM`

`CUSTOM` continues to require `request.customFrequencyNote` under the existing shared validation rule.

## Compatibility

Historical Contract v1 frequency rules are intentionally unchanged. The broadened rule applies only to Contract v2, which is the current Website → HestivaOS structured submission path.

No other service frequency policy is broadened by this change. In particular, Kitchen Cleaning retains its existing v1/v2 restriction unless separately approved and implemented.

## Reason

The customer-facing quote form now allows recurring Bedroom Cleaning and Living Area Cleaning beyond One-time/Custom. HestivaOS must accept the same v2 vocabulary so the Website cannot present a valid-looking option that the guarded ingestion boundary rejects.

## Verification

Focused Contract v2 tests cover every allowed frequency for Bedroom Cleaning and Living Area Cleaning and confirm that Kitchen Cleaning remains restricted.
