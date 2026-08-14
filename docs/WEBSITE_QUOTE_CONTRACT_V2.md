# Website → HestivaOS Quote Contract v2

**Status:** Implemented and active across the Website → HestivaOS guarded ingestion boundary.

Contract v2 extends the established v1 Website Quote payload specifically to make Laundry and Ironing non-lossy and fail-closed. HestivaOS continues to accept v1 for backward compatibility while the website uses the structured v2 path for Laundry/Ironing-capable submissions.

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

Requested quantities are commercial/operational requests, not a promise that unlimited loads can be completed. `WorkOrderAddOn` and `RecurringServiceAgreementAddOn` now persist positive integer quantities, recurring generation copies them into generated Work Orders, and Laundry/Ironing require explicit labour/time capacity approval before operational acceptance.

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

The guarded `POST /api/v1/integrations/website/quotes` runtime accepts and validates v2 submissions behind the dedicated Website integration bearer secret. The website sender uses the structured v2 fields and requires HestivaOS acknowledgement with the authoritative `quoteReference` before reporting successful intake.

Accepted-operation quantity persistence and capacity approval are implemented in HestivaOS; v2 Laundry/Ironing quantities therefore no longer cross a lossy boolean-only add-on boundary. Historical v1 compatibility remains intact and does not redefine the v2 Laundry rules.
