# Current website quote-to-OS value mapping

Verified 2026-08-10 against the authoritative current website vocabulary supplied from `HestivaHQ/hestiva` `src/routes/quote.tsx` and the Hestiva OS schema/catalogue. This is the canonical reconciliation input for future Slice 5M. It does not connect the website to Hestiva OS.

## Current quote flow

The eight steps are: Your Home; Cleaning Requirements; Personalise Your Service; Preferred Visit; Access and Household Details; Photos and Notes; Your Details; Review and Submit.

Required fields are Property Type, Suburb, Address, Floor Size, Bedrooms, and Bathrooms in Step 1; Service, Frequency, and Condition in Step 2; Preferred Date and Preferred Time in Step 4; and Full Name, Mobile, Email, and Contact Method in Step 7. Other values from the personalization, access/household, photo/note, and review steps remain optional quote inputs whose exact 5M transport contract is not implemented here.

## Service capability rules

One `Service` represents one canonical business capability. `Service.type` is availability with `PRIMARY`, `ADD_ON`, or `BOTH`; `BOTH` prevents duplicate records where the same capability is selectable in both contexts. Work Orders still have exactly one primary-capable `serviceId` and zero or many add-on-capable `WorkOrderAddOn` relationships. Cleaning Job Templates remain operational task definitions. The current quote contains no approved Service Scope values, so Hestiva OS has no `ServiceScopeOption` architecture.

Current primary selector values map by canonical normalized name except `Eco-Friendly Cleaning`, which aliases to `Eco-Conscious Cleaning`. `Add-on Services` and `Not sure` are quote-flow choices and must never become canonical Primary Services.

## Current frequency

| Current website value | WorkOrderFrequency | Disposition |
| --- | --- | --- |
| One-time | `ONE_TIME` | Exact deterministic mapping |
| Weekly | `WEEKLY` | Exact deterministic mapping |
| Every two weeks | `EVERY_TWO_WEEKS` | Exact deterministic mapping |
| Monthly | `MONTHLY` | Exact deterministic mapping |
| Custom | `CUSTOM` | Exact mapping; details use the existing custom note boundary |
| Fortnightly | `EVERY_TWO_WEEKS` | Legacy alias only; not current canonical website wording |

No service-specific frequency restrictions were found in the current source vocabulary.

## Current website add-ons

| Website value | Canonical concept | Disposition | Reason / boundary |
| --- | --- | --- | --- |
| Inside oven | Inside Oven Cleaning | Deterministic alias | Existing canonical add-on capability. |
| Inside fridge | Inside Fridge Cleaning | Deterministic alias | Existing canonical add-on capability. |
| Inside cupboards | Interior Cupboard Cleaning | Deterministic alias | Existing canonical add-on capability. |
| Interior windows | Interior Window Cleaning | Deterministic capability mapping | The one canonical capability is `BOTH`; no duplicate Service. |
| Laundry folding | Laundry Folding | Deterministic capability mapping | The one canonical capability is `BOTH`; no duplicate Service. |
| Ironing | Ironing | New canonical add-on | Current distinct website add-on capability. |
| Bed making | Bed Making | New canonical add-on | Current distinct website add-on capability. |
| Linen change | Linen Change | New canonical add-on | Current distinct website add-on capability. |
| Balcony or patio | — | Unresolved; fail closed | Existing Balcony Sweeping does not prove Patio equivalence. No lossy alias or new record. |
| Garage sweep | Garage Sweeping | Deterministic alias | Approved consistent operational wording. |
| Extra bathroom | Extra Bathroom Cleaning | New canonical add-on | Current add-on evidence distinguishes it from the Bathroom Sanitisation primary capability. One selection means one extra bathroom. |
| Extra refrigerator | — | Unresolved; fail closed | Means an additional unit; it is not an alias for Inside Fridge Cleaning. Quantity/pricing ownership needs a commercial decision. |
| Pet-hair treatment | Pet-Hair Treatment | New canonical add-on | Current distinct website add-on, with Property pet facts remaining separate context. |
| Eco-friendly products | — | Unresolved; fail closed | May be a product preference/restriction or chargeable capability; `productRestrictionNotes` and Eco-Conscious Cleaning do not establish pricing semantics. |
| Post-renovation dust removal | — | Unresolved; fail closed | `RECENTLY_RENOVATED` describes condition; the website value requests a possible task/charge. Both can coexist, but commercial semantics are unapproved. |

`WorkOrderAddOn` currently has a composite identity and no quantity. Repeated Service IDs are invalid. Slice 5K does not add a generic quantity/pricing engine. Extra refrigerator therefore blocks deterministic 5M handoff until quantity or an approved extra-unit capability is designed; it is never silently reduced to one Inside Fridge Cleaning selection.

## Current Property vocabulary

| Website field | Current vocabulary | OS ownership / follow-up |
| --- | --- | --- |
| Property Type | Apartment; Townhouse; House; Duplex; Other | Managed `PROPERTY_TYPE`; verify exact bootstrap alignment before 5M. |
| Floor Size | Under 80 m²; 80–150 m²; 151–250 m²; Over 250 m²; Not sure | Not modeled; focused Property alignment follow-up required. |
| Living Areas | 1; 2; 3; 4+ | Maps to existing controlled Property living-area counts. |
| Outdoor | None; Balcony; Patio; Both | Not modeled; focused Property alignment follow-up required. |
| Estate | No; Yes — estate; Yes — complex; Yes — gated community | Existing booleans do not preserve this full classification; focused follow-up required. |
| Apartment Bedrooms | Studio; 1; 2; 3; 4; 5+; Other | Existing controlled bedrooms cover all except `Other`; 5M/follow-up must fail closed on unsupported `Other`. |
| Other-property Bedrooms | 1; 2; 3; 4; 5+; Other | Existing controlled bedrooms cover all except `Other`. |
| Bathrooms | Dynamically constrained by bedroom selection | Existing counts own persisted value; website constraint requires 5M contract verification. |
| Storeys | 1 storey; 2 storeys; 3 storeys; 4+ storeys; Not sure | Existing model groups 3+ and cannot deterministically preserve all values; follow-up required. |
| Apartment unit floor | Ground floor; 1st; 2nd; 3rd; 4th; 5th–9th; 10th or above; Not sure | Not modeled; focused Property alignment follow-up required. |
| Townhouse unit floor | Ground-level unit; 1st; 2nd; 3rd or above; Not sure | Not modeled; focused Property alignment follow-up required. |

This table preserves the historical Slice 5K gap assessment. Slice 5J-A subsequently closed these Property destination gaps as recorded in the current-state table below; Slice 5K itself changed no Property schema or UI.

## Fail-closed rule

Only exact current mappings and explicit legacy aliases above are deterministic. Unresolved terms do not create Services, Add-ons, Property values, or notes automatically. Future 5M must resolve canonical IDs/enums at its trust boundary and reject or route unknown/unresolved values for human review.

## Current Property vocabulary — verified 2026-08-10

Authority: current `HestivaHQ/hestiva/src/routes/quote.tsx`; older `quote-options.ts` values are not authoritative where they conflict.

| Website field | Website value | OS field | OS value | Status |
| --- | --- | --- | --- | --- |
| Floor Size | Under 80 m² | `Property.floorSize` | `UNDER_80` | Deterministic |
| Floor Size | 80–150 m² | `Property.floorSize` | `FROM_80_TO_150` | Deterministic |
| Floor Size | 151–250 m² | `Property.floorSize` | `FROM_151_TO_250` | Deterministic |
| Floor Size | Over 250 m² | `Property.floorSize` | `OVER_250` | Deterministic |
| Floor Size | Not sure | `Property.floorSize` | `UNKNOWN` | Deterministic |
| Outdoor | None / Balcony / Patio / Both | `Property.outdoorArea` | `NONE` / `BALCONY` / `PATIO` / `BOTH` | Deterministic; not the chargeable add-on |
| Estate / Complex | No / Estate / Complex / Gated community | `Property.estateClassification` | `NONE` / `ESTATE` / `COMPLEX` / `GATED_COMMUNITY` | Deterministic for new input |
| Apartment Floor | Ground / 1st / 2nd / 3rd / 4th / 5th–9th / 10th+ / Not sure | `Property.unitFloor` | `GROUND` / `FIRST` / `SECOND` / `THIRD` / `FOURTH` / `FIFTH_TO_NINTH` / `TENTH_PLUS` / `UNKNOWN` | Deterministic, Apartment-only subset |
| Townhouse Floor | Ground-level / 1st / 2nd / 3rd+ / Not sure | `Property.unitFloor` | `GROUND` / `FIRST` / `SECOND` / `THIRD_PLUS` / `UNKNOWN` | Deterministic, Townhouse-only subset |
| Bedrooms | Studio / 1 / 2 / 3 / 4 / 5+ / Other | `Property.bedrooms` | `STUDIO` / `ONE` / `TWO` / `THREE` / `FOUR` / `FIVE_PLUS` / `OTHER` | Deterministic; Studio Apartment-only |
| Bathrooms | 1 / 2 / 3 / 4 / 5+ | `Property.bathrooms` | `ONE` / `TWO` / `THREE` / `FOUR` / `FIVE_PLUS` | Deterministic |
| Storeys | 1 / 2 / 3 / 4+ / Not sure | `Property.storeys` | `ONE` / `TWO` / `THREE` / `FOUR_PLUS` / `UNKNOWN` | Deterministic |
| Living Areas | 1 / 2 / 3 / 4+ | `Property.livingAreas` | `ONE` / `TWO` / `THREE` / `FOUR_PLUS` | Deterministic |

All current website Property values required by a future 5M handoff have deterministic destinations. Remaining 5M blockers are orchestration itself and the intentionally unresolved commercial mappings for extra-refrigerator quantity, chargeable balcony/patio cleaning, eco-friendly-product ownership, and post-renovation dust-removal boundaries; none is a Property destination gap.
