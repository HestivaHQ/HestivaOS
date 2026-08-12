# Website → HestivaOS Quote Contract v2

**Status:** Contract definition; transport activation remains a separate runtime step.

Contract v2 extends the established v1 Website Quote payload specifically to make Laundry and Ironing non-lossy and fail-closed.

## Version

- `schemaVersion`: `2.0`
- All unchanged customer, property, visit, access, household, safety, notes and photo fields retain their v1 meaning and validation.

## Structured Laundry request

Laundry and Ironing must not be transported as generic display-label add-ons in v2. They use `request.laundry`:

```json
{
  "request": {
    "primaryService": {
      "websiteValue": "Regular Home Cleaning",
      "canonicalService": "Regular Home Cleaning"
    },
    "frequency": "ONE_TIME",
    "homeCondition": "STANDARD",
    "addOns": [],
    "laundry": {
      "facilities": "WASHER_DRYER",
      "laundryLoads": 2,
      "ironingLoads": 1
    }
  }
}
```

### `facilities`

Allowed values:

- `WASHER_DRYER` — resolves server-side to Wash, Dry & Fold.
- `WASHER_LINE` — resolves server-side to Wash & Hang.
- `NO_WASHER` — invalid when Laundry is requested.

Facilities are required when `laundryLoads` is supplied. They are not required when the request contains only `ironingLoads`, because Ironing may be added for already-clean/dry clothing.

### Quantities

- `laundryLoads`: optional positive integer.
- `ironingLoads`: optional positive integer.
- At least one of the two must be present when `request.laundry` exists.

Requested quantities are commercial/operational requests, not a promise that unlimited loads can be completed. Final accepted quantities remain subject to the approved job-duration/labour-capacity guard before Work Order approval.

## Eligibility

Structured Laundry/Ironing is accepted only when the canonical primary service is:

- `Regular Home Cleaning`
- `Deep Cleaning`

Other primary services fail closed.

## Pricing authority

HestivaOS derives the outcome and owns the approved launch amounts:

- Wash, Dry & Fold: R175 / 17,500 minor units per standard load.
- Wash & Hang: R125 / 12,500 minor units per standard load.
- Ironing: R150 / 15,000 minor units per standard load.

The website may display these approved amounts but is not the authoritative pricing engine.

## Generic add-on boundary

`Laundry`, legacy `Laundry Folding`, and `Ironing` are rejected inside generic `request.addOns` in v2. This prevents quantity/facility information from being reconstructed from labels or free text.

## Runtime boundary

This contract definition does not by itself expose or switch the private Website → HestivaOS ingestion endpoint. Runtime activation must be coordinated with the website sender and accepted-operation quantity persistence so no request can be accepted and then lose its Laundry/Ironing quantities.
