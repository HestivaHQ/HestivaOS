# Website → HestivaOS Quote Contract v2

**Status:** Implemented and active across the Website → HestivaOS guarded ingestion boundary.

Contract v2 extends the established v1 Website Quote payload to make Laundry and Ironing non-lossy, align current Website property-layout semantics, and carry the approved structured Post-Event Cleaning facts. HestivaOS continues to accept v1 for backward compatibility while the live Website uses the structured v2 path.

## Version

- `schemaVersion`: `2.0`
- Customer, visit, access, household, safety, notes and photo fields retain their v1 meaning and validation except where this document explicitly records a v2 correction or additive structured field.
- Additive v2 fields remain fail-closed when supplied outside their approved service context.

## Townhouse property-layout correction

Historical Contract v1 grouped Apartment and Townhouse as exact-floor unit properties and required an integer exact floor from 0–50 plus building-access information for both.

Contract v2 corrects that model for the live Website:

- **Apartment** continues to require `property.exactFloor` and `property.buildingAccess`.
- **Townhouse** is represented by `property.storeys` and does **not** require Apartment-style exact-floor or elevator/stairs data.
- Historical v1 validation remains unchanged for backward compatibility.

The Website must not invent a high-rise floor number for a Townhouse merely to satisfy the older v1 rule. Ambiguous/open-ended storey answers may be transported conservatively and retained for Admin review rather than fabricated into an exact count.

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

Requested quantities are commercial/operational requests, not a promise that unlimited loads can be completed. `WorkOrderAddOn` and `RecurringServiceAgreementAddOn` persist positive integer quantities, recurring generation copies them into generated Work Orders, and Laundry/Ironing require explicit labour/time capacity approval before operational acceptance.

## Laundry/Ironing eligibility

Structured Laundry/Ironing is accepted only when the canonical primary service is:

- `Regular Home Cleaning`
- `Deep Cleaning`

Other primary services fail closed.

## Structured Post-Event Cleaning request

`Post-Event Cleaning` is an approved v2-only Website primary service. Contract v1 remains unchanged for backward compatibility.

The Website must send the exact primary mapping:

```json
{
  "websiteValue": "Post-Event Cleaning",
  "canonicalService": "Post-Event Cleaning"
}
```

Post-Event Cleaning is `ONE_TIME` only in v1 of the service model and requires `request.postEvent` with the structured facts below:

- `eventType`: `PARTY_BIRTHDAY`, `WEDDING_RECEPTION`, `FAMILY_GATHERING`, `CORPORATE_EVENT`, `FUNERAL_MEMORIAL`, or `OTHER`;
- `venueType`: `HOME`, `APARTMENT`, `BUSINESS_PREMISES`, `EVENT_VENUE`, or `OTHER`;
- `guestBand`: `ONE_TO_20`, `FROM_21_TO_50`, `FROM_51_TO_100`, `FROM_101_TO_150`, or `FROM_150_UP`;
- `bathrooms`: exact positive whole number;
- `kitchenSubstantiallyUsed`: boolean;
- `dishwashing`: `NONE`, `MODERATE`, or `HEAVY`;
- `outdoorAreas`: unique array containing `PATIO`, `BALCONY`, `BRAAI_AREA`, and/or `GARDEN_ENTERTAINMENT_AREA`;
- `wasteLevel`: `LIGHT`, `MODERATE`, or `HEAVY`;
- `significantOrdinarySoiling`: boolean;
- `lateNightOrOvernight`: boolean;
- `bulkWasteRemovalRequested`: boolean;
- `specialistContamination`: boolean;
- `specialistCarpetOrUpholstery`: boolean;
- `complexVenue`: boolean.

Post-Event facts are valid only when Post-Event Cleaning is the selected primary service. Missing, malformed, duplicated or stray Post-Event facts fail closed. Review-triggering values such as 150+ guests, overnight work, bulk waste, specialist treatment or complex venues remain valid customer facts; they are not rejected merely because they later force `NEEDS_ATTENTION` rather than automatic pricing.

The Website collects and transports facts only. HestivaOS remains authoritative for the approved floor-size base ladder, additional cleaner-hours, R100/additional-hour adjustment, profitability safeguard, automatic-pricing ceiling and review decisions documented in `POST_EVENT_CLEANING_V1.md`.

## Pricing authority and review-required intake

HestivaOS derives the Laundry/Ironing outcome and owns the approved launch amounts:

- Wash, Dry & Fold: R175 / 17,500 minor units per standard load.
- Wash & Hang: R125 / 12,500 minor units per standard load.
- Ironing: R150 / 15,000 minor units per standard load.

Post-Event pricing is likewise calculated only by HestivaOS from the structured v2 facts and the canonical Post-Event operating model. The Website may display approved public `from` amounts but is not the authoritative pricing engine.

A valid authenticated v2 request is not discarded merely because all authoritative operational-cost facts cannot yet be completed. If costing is complete, HestivaOS applies the normal profitability safeguard. If costing requires review, HestivaOS persists the Quote as `NEEDS_ATTENTION`, returns the authoritative `quoteReference`, and records the unresolved costing facts/provenance. The resulting stored pricing snapshot is non-final and must not be represented as a profitability-protected customer price until review is complete.

Authentication, contract-validation, immutable-submission conflict, database, and Quote-reference-capacity failures remain fail-closed.

## Generic add-on boundary

`Laundry`, legacy `Laundry Folding`, and `Ironing` are rejected inside generic `request.addOns` in v2. This prevents quantity/facility information from being reconstructed from labels or free text.

## Runtime boundary

The guarded `POST /api/v1/integrations/website/quotes` runtime accepts and validates v2 submissions behind the dedicated Website integration bearer secret. The Website sender uses structured v2 fields and requires HestivaOS acknowledgement with the authoritative `quoteReference` before reporting successful intake.

The Quote transport and immutable pricing lines preserve structured quantities and Post-Event facts. Existing accepted-Quote conversion remains governed by the canonical Quote acceptance/handoff implementation and is not redefined by this contract extension. Historical v1 compatibility remains intact and does not inherit the v2 Post-Event or other v2 corrections recorded here.
