# Current website quote-to-OS value mapping

## Slice 5M-B current contract supersession — 2026-08-11

The historical Slice 5K reconciliation below is retained for engineering history, but it is no longer the current integration contract where Issue #73 has since resolved a gap. The current cross-repository boundary is [`WEBSITE_QUOTE_CONTRACT_V1.md`](WEBSITE_QUOTE_CONTRACT_V1.md) and `apps/api/src/quotes/website-quote-contract.ts`.

Current resolved rules that supersede older unresolved statements below:

- Current website source does enforce service-specific frequency restrictions; Slice 5M-B preserves those verified rules rather than claiming none exist.
- `Post-Renovation Cleaning` is a primary Service intent; `RECENTLY_RENOVATED` remains an independent Home Condition.
- `Eco-friendly products` is a boolean quote preference, not an add-on.
- `Extra Refrigerator` and `Balcony / Patio Cleaning` carry explicit positive-integer quantity in payload v1; other v1 add-ons use quantity 1.
- Bathrooms in payload v1 are only `ONE`, `TWO`, `THREE`, `FOUR`, or `FIVE_PLUS`.
- Floor size now uses the precise `UNDER_40`, `FROM_40_TO_59`, `FROM_60_TO_79`, `FROM_80_TO_99`, `FROM_100_TO_129`, `FROM_130_TO_169`, `FROM_170_TO_219`, `FROM_220_TO_299`, `FROM_300_UP`, or `UNKNOWN` vocabulary. New Website Quote submissions reject the superseded broad floor-size values. Reusable Property storage retains the old broad values only for historical compatibility and never auto-converts them to fabricated precision.
- `Add-on Services` and `Not sure` remain explicit pseudo choices with `canonicalService: null`, which requires `NEEDS_ATTENTION`; unknown mappings fail closed.
- Exact Apartment/Townhouse floor is transported as integer `exactFloor` 0–50 with explicit building-access method. The older grouped `Property.unitFloor` remains current Property storage, so exact operational persistence is still a later 5M handoff responsibility and must not be falsely claimed as already implemented.
- Customer Quote photo identity is stable `clientPhotoId` plus SHA-256 in payload v1. The merged 5M-A schema provides Quote photo retry/status storage but does not yet persist the hash; runtime storage/deduplication mapping remains later integration work.
- Pricing v1 is HestivaOS-authoritative, returned as immutable ZAR integer-minor-unit subtotal/adjustments/total plus line breakdown. The 5M-A storage model exists; the calculator and external-to-persistence adapter are not implemented by this mapping document.

## Historical Slice 5K reconciliation

Verified 2026-08-10 against the authoritative current website vocabulary supplied from `HestivaHQ/hestiva` `src/routes/quote.tsx` and the Hestiva OS schema/catalogue. This was the canonical reconciliation input for future Slice 5M at that point in time. It did not connect the website to Hestiva OS.

### Historical quote flow

The eight steps were: Your Home; Cleaning Requirements; Personalise Your Service; Preferred Visit; Access and Household Details; Photos and Notes; Your Details; Review and Submit.

Required fields were Property Type, Suburb, Address, Floor Size, Bedrooms, and Bathrooms in Step 1; Service, Frequency, and Condition in Step 2; Preferred Date and Preferred Time in Step 4; and Full Name, Mobile, Email, and Contact Method in Step 7. Other values from the personalization, access/household, photo/note, and review steps remained optional quote inputs whose exact 5M transport contract was not implemented in Slice 5K.

### Service capability rules

One `Service` represents one canonical business capability. `Service.type` is availability with `PRIMARY`, `ADD_ON`, or `BOTH`; `BOTH` prevents duplicate records where the same capability is selectable in both contexts. Work Orders still have exactly one primary-capable `serviceId` and zero or many add-on-capable `WorkOrderAddOn` relationships. Cleaning Job Templates remain operational task definitions. The current quote contains no approved Service Scope values, so Hestiva OS has no `ServiceScopeOption` architecture.

The historical primary selector mapped by canonical normalized name except `Eco-Friendly Cleaning`, which aliases to `Eco-Conscious Cleaning`. `Add-on Services` and `Not sure` are quote-flow choices and must never become canonical Primary Services.

### Historical frequency mapping

| Website value | WorkOrderFrequency | Disposition |
| --- | --- | --- |
| One-time | `ONE_TIME` | Exact deterministic mapping |
| Weekly | `WEEKLY` | Exact deterministic mapping |
| Every two weeks | `EVERY_TWO_WEEKS` | Exact deterministic mapping |
| Monthly | `MONTHLY` | Exact deterministic mapping |
| Custom | `CUSTOM` | Exact mapping; details use the existing custom note boundary |
| Fortnightly | `EVERY_TWO_WEEKS` | Legacy alias only; not current canonical website wording |

The Slice 5K statement that no service-specific frequency restrictions were found is superseded by the verified current website `LiveFormSubmission.tsx` rules and the Slice 5M-B contract.

### Historical website add-on assessment

| Website value | Canonical concept | Historical Slice 5K disposition | Current 5M note |
| --- | --- | --- | --- |
| Inside oven | Inside Oven Cleaning | Deterministic alias | Deterministic structured mapping |
| Inside fridge | Inside Fridge Cleaning | Deterministic alias | Deterministic structured mapping |
| Inside cupboards | Interior Cupboard Cleaning | Deterministic alias | Deterministic structured mapping |
| Interior windows | Interior Window Cleaning | Deterministic capability mapping | One canonical `BOTH` capability |
| Laundry folding | Laundry Folding | Deterministic capability mapping | One canonical `BOTH` capability |
| Ironing | Ironing | New canonical add-on | Structured add-on, quantity 1 |
| Bed making | Bed Making | New canonical add-on | Structured add-on, quantity 1 |
| Linen change | Linen Change | New canonical add-on | Structured add-on, quantity 1 |
| Balcony or patio | — | Unresolved; fail closed | Resolved product intent as `Balcony / Patio Cleaning` with explicit quantity; catalogue/runtime resolution still must be exact |
| Garage sweep | Garage Sweeping | Deterministic alias | Structured add-on, quantity 1 |
| Extra bathroom | Extra Bathroom Cleaning | New canonical add-on | Structured add-on, quantity 1 in v1 |
| Extra refrigerator | — | Unresolved; fail closed | Resolved as `Extra Refrigerator` with explicit quantity |
| Pet-hair treatment | Pet-Hair Treatment | New canonical add-on | Structured add-on, quantity 1 |
| Eco-friendly products | — | Unresolved; fail closed | Resolved as boolean preference, not add-on |
| Post-renovation dust removal | — | Unresolved; fail closed | Superseded by primary `Post-Renovation Cleaning`; `RECENTLY_RENOVATED` remains separate condition |

The historical `WorkOrderAddOn` model has no quantity. Slice 5M-B defines quote-payload quantity but does not claim accepted Work Order/Recurring Agreement quantity persistence is already implemented; that adapter/data requirement remains part of later accepted-handoff work.

### Historical/current Property vocabulary

| Website field | Current 5M vocabulary | OS ownership / follow-up |
| --- | --- | --- |
| Property Type | Apartment; Townhouse; House; Duplex; Other | Managed `PROPERTY_TYPE` and deterministic v1 enum mapping |
| Floor Size | Under 40 m²; 40–59 m²; 60–79 m²; 80–99 m²; 100–129 m²; 130–169 m²; 170–219 m²; 220–299 m²; 300+ m²; Not sure | Existing controlled Property destination; historical broad values remain compatibility-only |
| Living Areas | 1; 2; 3; 4+ | Existing controlled Property destination |
| Outdoor | None; Balcony; Patio; Both | Existing controlled Property destination; distinct from chargeable add-on |
| Estate | No; Yes — estate; Yes — complex; Yes — gated community | Existing controlled Property destination |
| Apartment Bedrooms | Studio; 1; 2; 3; 4; 5+; Other | Existing controlled destination; Studio Apartment-only |
| Other-property Bedrooms | 1; 2; 3; 4; 5+; Other | Existing controlled destination |
| Bathrooms | 1; 2; 3; 4; 5+ | Existing controlled destination; no `OTHER` in v1 |
| Storeys | 1 storey; 2 storeys; 3 storeys; 4+ storeys; Not sure | Existing controlled destination including compatibility states |
| Exact unit floor | Ground / Floor 1..50 in current enhancement layer | v1 transports integer 0..50; exact persistence is later 5M work |
| Building access | Elevator / Stairs / both | v1 first-class field; later handoff owns operational destination |

### Current deterministic Property floor-size mappings

| Website value | OS field | OS value |
| --- | --- | --- |
| Under 40 m² | `Property.floorSize` | `UNDER_40` |
| 40–59 m² | `Property.floorSize` | `FROM_40_TO_59` |
| 60–79 m² | `Property.floorSize` | `FROM_60_TO_79` |
| 80–99 m² | `Property.floorSize` | `FROM_80_TO_99` |
| 100–129 m² | `Property.floorSize` | `FROM_100_TO_129` |
| 130–169 m² | `Property.floorSize` | `FROM_130_TO_169` |
| 170–219 m² | `Property.floorSize` | `FROM_170_TO_219` |
| 220–299 m² | `Property.floorSize` | `FROM_220_TO_299` |
| 300+ m² | `Property.floorSize` | `FROM_300_UP` |
| Not sure (floor size) | `Property.floorSize` | `UNKNOWN` |

Historical `UNDER_80`, `FROM_80_TO_150`, `FROM_151_TO_250`, and `OVER_250` remain valid only for previously stored reusable Property records. They are not valid values for new Website Quote Submission Payload v1 material and are not offered when creating a new Property in HestivaOS. When editing a legacy Property, its existing historical value remains visible until reliable size evidence is available.

### Other deterministic Property mappings

| Website value | OS field | OS value |
| --- | --- | --- |
| None / Balcony / Patio / Both | `Property.outdoorArea` | `NONE` / `BALCONY` / `PATIO` / `BOTH` |
| No / Estate / Complex / Gated community | `Property.estateClassification` | `NONE` / `ESTATE` / `COMPLEX` / `GATED_COMMUNITY` |
| Studio / 1 / 2 / 3 / 4 / 5+ / Other | `Property.bedrooms` | `STUDIO` / `ONE` / `TWO` / `THREE` / `FOUR` / `FIVE_PLUS` / `OTHER` |
| 1 / 2 / 3 / 4 / 5+ bathrooms | `Property.bathrooms` | `ONE` / `TWO` / `THREE` / `FOUR` / `FIVE_PLUS` |
| 1 / 2 / 3 / 4+ living areas | `Property.livingAreas` | `ONE` / `TWO` / `THREE` / `FOUR_PLUS` |
| 1 / 2 / 3 / 4+ / Not sure storeys | `Property.storeys` | `ONE` / `TWO` / `THREE` / `FOUR_PLUS` / `UNKNOWN` |

## Fail-closed rule

Only exact current mappings and explicit approved aliases are deterministic. Unknown or unresolved values do not create Services, Add-ons, Property values, or inferred notes automatically. The 5M trust boundary rejects them or persists the explicitly approved pseudo-choice as `NEEDS_ATTENTION`; it never invents a fuzzy mapping.

## Recurring-service handoff target enabled by 5L

No accepted Quote handoff is implemented by 5M-B. A later accepted ONE_TIME Quote maps to a Work Order. Weekly, Every two weeks, Monthly, and Custom map to Property-owned recurring agreement rules, with the initial Work Order handled by the accepted-handoff transaction. Preferred date seeds the future effective date; `MORNING`, `MIDDAY`, `AFTERNOON`, and `FLEXIBLE` use the controlled time-window vocabulary. `CUSTOM` requires descriptive detail and remains manual scheduling. The Quote Submission contract itself creates no Customer, Property, Work Order, or Recurring Service Agreement.
