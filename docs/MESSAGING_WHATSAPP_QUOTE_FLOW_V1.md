# Homent WhatsApp Quote Flow V1 contract

## Status

**FROZEN CONTRACT — approved architecture, not production runtime.**

This document freezes the customer-facing and mapping contract for the planned primary WhatsApp Quote Flow before Flow/session persistence, launch, completion parsing or PhotoPicker retrieval is implemented.

- Contract ID: `HOMENT_QUOTE_REQUEST_V1`
- Meta Flow JSON version target: `7.3`
- HestivaOS parser/mapping contract: `HOMENT_QUOTE_REQUEST_MAPPING_V1`
- Completion payload contract: `HOMENT_QUOTE_REQUEST_COMPLETION_V1`
- Coordination source: `HestivaHQ/HestivaOS#116`
- Architecture decision: ADR-0088

The Meta provider Flow ID/name is a deployment artifact and is intentionally not invented in this contract. A future durable Flow session must bind the actual provider Flow ID plus the exact contract and mapping versions above.

## Authority and non-goals

The Flow is presentation/data collection only. It does not own Quote validation, pricing, Customer identity, availability, booking or operational state. Completed values map into the existing HestivaOS Quote v2 business facts and are revalidated by `validateQuoteBusinessFacts()` before any authoritative Quote action. HestivaOS remains the sole Quote/pricing/business authority.

This contract does not add production Flow/session persistence, provider launch/completion code, PhotoPicker retrieval code, AI, live pricing or `data_exchange`. It does not modify the Messenger conversational model and does not make PR #214 implemented state.

ADR-0049 remains authoritative for reuse of canonical Quote facts. ADR-0081 remains authoritative for private provider-media principles. ADR-0088 remains authoritative for Flow-first presentation, interruption/help behavior, versioning and fallback.

## Provider constraints used by V1

V1 is designed as a static Flow. Flow JSON `7.3` is the target. The eight screens below remain comfortably below the current 50-components-per-screen limit. Conditional UI is used for relevance only; the parser never trusts hidden/visible state as business validation.

The Flow must be validated in Meta's draft/preview tooling before publication. Unsupported or unavailable Flow delivery uses the fallback chain instead of changing this contract.

## Exact screen structure

V1 has eight physical screens, preserving the live Website's eight-section mental model:

| Order | Stable screen ID | Customer title | Purpose |
| --- | --- | --- | --- |
| 1 | `YOUR_HOME` | Your Home | Property identity, address and layout |
| 2 | `CLEANING_REQUIREMENTS` | Cleaning Requirements | Primary service, frequency, condition and conditional Post-Event facts |
| 3 | `PERSONALISE_SERVICE` | Personalise Your Service | Add-ons, quantities, eco preference and structured Laundry/Ironing |
| 4 | `PREFERRED_VISIT` | Preferred Visit | Requested date/time, flexibility, urgency and recurring notes |
| 5 | `ACCESS_HOUSEHOLD` | Access and Household Details | Arrival/access, presence, pets and safety declarations |
| 6 | `PHOTOS_NOTES` | Photos and Notes | Optional Quote photos and remaining notes/evidence |
| 7 | `YOUR_DETAILS` | Your Details | Explicit customer contact facts |
| 8 | `REVIEW_SUBMIT` | Review and Submit | Customer review and explicit Flow completion |

Screen IDs and field IDs are machine identifiers. Display wording may change without changing the mapping contract as long as meaning/options/validation remain unchanged.

## Field contract — Screen 1: `YOUR_HOME`

| Stable field ID | Label | Component | Required | Allowed values / validation | Canonical destination | Conditional / help | Guided fallback / Website equivalent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `property_type` | Property type | Dropdown | Yes | `APARTMENT`, `TOWNHOUSE`, `HOUSE`, `DUPLEX`, `OTHER` | `property.propertyType` | None | Guided `PROPERTY_TYPE`; Website `propertyType` |
| `property_type_other` | Describe the property type | TextArea | If `OTHER` | trimmed non-empty text | `notes.additionalNotes` as `Property type details: <text>` | Visible only for `OTHER` | No current guided equivalent; Website `propertyTypeOther` uses the same notes projection |
| `address_line_1` | Full service address | TextInput | Yes | trimmed non-empty | `property.addressLine1` | Help: “Street number and street name.” | Guided `ADDRESS_LINE_1`; Website `address` |
| `suburb` | Suburb | TextInput | Yes | trimmed non-empty | `property.suburb` | None | Guided `SUBURB`; Website `suburb` |
| `postal_code` | Postal code | TextInput | No | string when supplied | `property.postalCode` | Optional | No current guided equivalent; Website `postcode` |
| `country_sa_confirmed` | This property is in South Africa | OptIn | Yes | must be selected/true | derives `property.country = "South Africa"` | Flow cannot continue automated V1 without confirmation | Guided `COUNTRY_CONFIRMATION`; Website derives South Africa |
| `floor_size` | Approximate floor size | Dropdown | Yes | `UNDER_40`, `FROM_40_TO_59`, `FROM_60_TO_79`, `FROM_80_TO_99`, `FROM_100_TO_129`, `FROM_130_TO_169`, `FROM_170_TO_219`, `FROM_220_TO_299`, `FROM_300_UP`, `UNKNOWN` | `property.floorSize` | Help: “Choose Not sure if you do not know the size.” | Guided `FLOOR_SIZE`; Website `floorSize` |
| `bedrooms_apartment` | Bedrooms | Dropdown | If `APARTMENT` | `STUDIO`, `ONE`, `TWO`, `THREE`, `FOUR`, `FIVE_PLUS`, `OTHER` | `property.bedrooms` | Visible only for Apartment | Guided `BEDROOMS`; Website Apartment bedroom list |
| `bedrooms_other` | Bedrooms | Dropdown | If non-Apartment | `ONE`, `TWO`, `THREE`, `FOUR`, `FIVE_PLUS`, `OTHER` | `property.bedrooms` | Visible only when property type is not Apartment | Guided `BEDROOMS`; Website non-Apartment list |
| `bathrooms` | Bathrooms | Dropdown | Yes | `ONE`, `TWO`, `THREE`, `FOUR`, `FIVE_PLUS` | `property.bathrooms` | None | Guided `BATHROOMS`; Website `bathrooms` |
| `living_areas` | Living areas | Dropdown | Yes | `ONE`, `TWO`, `THREE`, `FOUR_PLUS` | `property.livingAreas` | Help: “Lounges, family rooms or similar living spaces.” | Guided `LIVING_AREAS`; Website `livingAreas` |
| `storeys` | Storeys in the home | Dropdown | If `TOWNHOUSE`, `HOUSE`, `OTHER` | `ONE`, `TWO`, `THREE`, `FOUR_PLUS`, `UNKNOWN` | `property.storeys` | Hidden for Apartment/Duplex. `DUPLEX` derives `TWO`. | No current guided equivalent; Website `storeys` |
| `apartment_floor` | Exact floor / level | TextInput numeric | If `APARTMENT` | whole integer `0..50`; `0` = ground | `property.exactFloor` | Visible only for Apartment | Guided `APARTMENT_FLOOR`; Website enhanced `unitFloorExact` |
| `apartment_access` | How do we get to your unit? | Dropdown | If `APARTMENT` | `ELEVATOR`, `STAIRS`, `ELEVATOR_AND_STAIRS` | `property.buildingAccess` | Visible only for Apartment | Guided `APARTMENT_ACCESS`; Website enhanced `buildingAccess` |
| `outdoor_area` | Balcony or patio | Dropdown | Yes | `NONE`, `BALCONY`, `PATIO`, `BOTH` | `property.outdoorArea` | None | Guided `OUTDOOR_AREA`; Website `outdoor` |
| `estate_classification` | Estate or complex | Dropdown | Yes | `NONE`, `ESTATE`, `COMPLEX`, `GATED_COMMUNITY` | `property.estateClassification` | None | Guided `ESTATE_CLASSIFICATION`; Website `estate` |

V1 deliberately does not request GPS coordinates. Website geolocation is an optional convenience, not a required canonical Quote fact. HestivaOS may receive no `property.location` from Flow V1.

## Field contract — Screen 2: `CLEANING_REQUIREMENTS`

### Primary service options

`primary_service` is a required Dropdown. Its stable values and canonical mapping are:

| Flow value | Customer label | Canonical mapping |
| --- | --- | --- |
| `REGULAR_HOME` | Regular Home Cleaning | `{ websiteValue: "Regular Home Cleaning", canonicalService: "Regular Home Cleaning" }` |
| `DEEP` | Deep Cleaning | `{ websiteValue: "Deep Cleaning", canonicalService: "Deep Cleaning" }` |
| `MOVE_IN` | Move-In Cleaning | `{ websiteValue: "Move-In Cleaning", canonicalService: "Move-In Cleaning" }` |
| `MOVE_OUT` | Move-Out Cleaning | `{ websiteValue: "Move-Out Cleaning", canonicalService: "Move-Out Cleaning" }` |
| `KITCHEN` | Kitchen Cleaning | `{ websiteValue: "Kitchen Cleaning", canonicalService: "Kitchen Cleaning" }` |
| `BATHROOM` | Bathroom Sanitisation | `{ websiteValue: "Bathroom Sanitisation", canonicalService: "Bathroom Sanitisation" }` |
| `BEDROOM` | Bedroom Cleaning | `{ websiteValue: "Bedroom Cleaning", canonicalService: "Bedroom Cleaning" }` |
| `LIVING_AREA` | Living Area Cleaning | `{ websiteValue: "Living Area Cleaning", canonicalService: "Living Area Cleaning" }` |
| `INTERIOR_WINDOWS` | Interior Window Cleaning | `{ websiteValue: "Interior Window Cleaning", canonicalService: "Interior Window Cleaning" }` |
| `POST_RENOVATION` | Post-Renovation Cleaning | `{ websiteValue: "Post-Renovation Cleaning", canonicalService: "Post-Renovation Cleaning" }` |
| `POST_EVENT` | Post-Event Cleaning | exact Post-Event canonical service mapping |
| `NOT_SURE` | Not sure | `{ websiteValue: "Not sure", canonicalService: null }` |

V1 does not expose `Laundry Folding` as a primary service. Laundry/Ironing are add-ons only. It also does not expose legacy `Apartment Cleaning` or `Eco-Friendly Cleaning` primary choices because they are not choices in the current public Website form; eco-friendly products remain a preference. HestivaOS service-domain support is not deleted by this presentation decision.

### Frequency contract

Frequency presentation is service-specific. The parser resolves exactly one canonical `request.frequency` and rejects multiple/contradictory frequency fields.

| Stable field ID | Visible for | Options | Canonical destination |
| --- | --- | --- | --- |
| `frequency_full` | `REGULAR_HOME`, `BEDROOM`, `LIVING_AREA` | `ONE_TIME`, `WEEKLY`, `EVERY_TWO_WEEKS`, `MONTHLY`, `CUSTOM` | `request.frequency` |
| `frequency_deep` | `DEEP` | `ONE_TIME`, `MONTHLY`, `CUSTOM` | `request.frequency` |
| `frequency_simple` | `KITCHEN`, `BATHROOM`, `INTERIOR_WINDOWS`, `POST_RENOVATION`, `NOT_SURE` | `ONE_TIME`, `CUSTOM`; `POST_RENOVATION` is intentionally limited to Website-approved One-time/Custom | `request.frequency` |
| derived `ONE_TIME` | `MOVE_IN`, `MOVE_OUT`, `POST_EVENT` | no customer frequency field; display concise “This service is once-off.” | `request.frequency = ONE_TIME` |

`BEDROOM` and `LIVING_AREA` follow the current HestivaOS Quote v2 domain allowance for the full recurring vocabulary. This is a documented difference from the Website's older client-side frequency controller, which still limits those two services to One-time/Custom.

Other Screen 2 fields:

| Stable field ID | Label | Component | Required | Allowed values / validation | Canonical destination | Conditional / help | Guided fallback / Website equivalent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `primary_service` | Cleaning service | Dropdown | Yes | exact table above | `request.primaryService` | Help: “Regular is routine upkeep; Deep is a more thorough clean for heavier build-up.” | Guided `PRIMARY_SERVICE`; Website `service` |
| `service_not_sure_details` | Tell us what you would like cleaned | TextArea | If `NOT_SURE` | trimmed non-empty | `notes.additionalNotes` as `Requested service details: <text>` | Visible only for Not sure; this path is review-safe, never guessed into a Service | No current guided description equivalent; Website `serviceOther` |
| `frequency_full` / `frequency_deep` / `frequency_simple` | Frequency | Dropdown | when visible | exact service-specific table | `request.frequency` | Help: “Dates remain requests until Homent confirms availability.” | Guided `FREQUENCY`; Website `frequency` |
| `custom_frequency_note` | Describe your preferred schedule | TextArea | If resolved frequency = `CUSTOM` | trimmed non-empty | `request.customFrequencyNote` | Visible only for Custom | Guided `CUSTOM_FREQUENCY_NOTE`; Website `customFrequency` |
| `home_condition` | Home condition | Dropdown | Yes | `LIGHT_UPKEEP`, `STANDARD`, `EXTRA_ATTENTION`, `HEAVY_BUILDUP`, `RECENTLY_RENOVATED`, `VACANT`, `MOVE_IN_OUT` | `request.homeCondition` | Help: “Choose the option closest to the home's condition now. Homent will still validate the request.” | Guided `HOME_CONDITION`; Website `condition` |

### Conditional Post-Event fields

All fields below are visible only when `primary_service = POST_EVENT`. Post-Event is always `ONE_TIME`. The fields map directly to `request.postEvent` and must be absent for every other service.

| Stable field ID | Label | Component | Required | Allowed values / validation | Canonical destination |
| --- | --- | --- | --- | --- | --- |
| `post_event_type` | Event type | Dropdown | Yes | `PARTY_BIRTHDAY`, `WEDDING_RECEPTION`, `FAMILY_GATHERING`, `CORPORATE_EVENT`, `FUNERAL_MEMORIAL`, `OTHER` | `request.postEvent.eventType` |
| `post_event_venue_type` | Venue / property context | Dropdown | Yes | `HOME`, `APARTMENT`, `BUSINESS_PREMISES`, `EVENT_VENUE`, `OTHER` | `request.postEvent.venueType` |
| `post_event_guest_band` | Approximate guests | Dropdown | Yes | `ONE_TO_20`, `FROM_21_TO_50`, `FROM_51_TO_100`, `FROM_101_TO_150`, `FROM_150_UP` | `request.postEvent.guestBand` |
| `post_event_bathrooms` | Bathrooms used | TextInput numeric | Yes | positive whole number; Flow V1 UI caps at `20` to match guided safety bound | `request.postEvent.bathrooms` |
| `post_event_kitchen_used` | Kitchen substantially used? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `request.postEvent.kitchenSubstantiallyUsed` |
| `post_event_dishwashing` | Dishwashing required | Dropdown | Yes | `NONE`, `MODERATE`, `HEAVY` | `request.postEvent.dishwashing` |
| `post_event_outdoor_areas` | Outdoor event areas needing cleaning | CheckboxGroup | No | `PATIO`, `BALCONY`, `BRAAI_AREA`, `GARDEN_ENTERTAINMENT_AREA`; no duplicates | `request.postEvent.outdoorAreas` (empty array if none) |
| `post_event_waste_level` | Ordinary event waste | Dropdown | Yes | `LIGHT`, `MODERATE`, `HEAVY` | `request.postEvent.wasteLevel` |
| `post_event_significant_soiling` | Significant ordinary spills or soiling? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `request.postEvent.significantOrdinarySoiling` |
| `post_event_overnight` | Late-night or overnight cleaning? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `request.postEvent.lateNightOrOvernight` |
| `post_event_bulk_waste` | Bulk/off-site waste removal requested? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `request.postEvent.bulkWasteRemovalRequested` |
| `post_event_specialist_contamination` | Specialist contamination involved? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `request.postEvent.specialistContamination` |
| `post_event_specialist_carpet` | Specialist carpet/upholstery treatment? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `request.postEvent.specialistCarpetOrUpholstery` |
| `post_event_complex_venue` | Large or operationally complex venue? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `request.postEvent.complexVenue` |

Help on this block is one short introduction: “Tell us about the event and cleanup so Homent can judge the workload. Specialist or unusual work may need review.” The corresponding guided questions are `EVENT_TYPE` through `COMPLEX_VENUE`; Website equivalents are the `field-postEvent...` enhancement fields.

## Field contract — Screen 3: `PERSONALISE_SERVICE`

`add_ons` is an optional CheckboxGroup containing these stable values. Unselected means an empty generic add-on list.

| Flow value | Customer label | Canonical Service | Quantity |
| --- | --- | --- | --- |
| `INSIDE_OVEN` | Inside oven | `Inside Oven Cleaning` | fixed `1` |
| `INSIDE_FRIDGE` | Inside fridge | `Inside Fridge Cleaning` | fixed `1` |
| `INSIDE_CUPBOARDS` | Inside cupboards | `Interior Cupboard Cleaning` | fixed `1` |
| `INTERIOR_WINDOWS` | Interior windows | `Interior Window Cleaning` | fixed `1` |
| `BED_MAKING` | Bed making | `Bed Making` | fixed `1` |
| `LINEN_CHANGE` | Linen change | `Linen Change` | fixed `1` |
| `BALCONY_PATIO` | Balcony / patio cleaning | `Balcony / Patio Cleaning` | from `balcony_patio_quantity` |
| `GARAGE_SWEEP` | Garage sweep | `Garage Sweeping` | fixed `1` |
| `EXTRA_BATHROOM` | Extra bathroom | `Extra Bathroom Cleaning` | fixed `1` |
| `EXTRA_REFRIGERATOR` | Extra refrigerator | `Extra Refrigerator` | from `extra_refrigerator_quantity` |
| `PET_HAIR` | Pet-hair treatment | `Pet-Hair Treatment` | fixed `1` |

Other fields:

| Stable field ID | Label | Component | Required | Validation | Canonical destination | Conditional / help | Guided / Website |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `add_ons` | Add-ons | CheckboxGroup | No | only values above, no duplicates | `request.addOns` | Help: “Choose extras you want included. Quantities are requested only where HestivaOS supports them.” | Guided `ADD_ONS`; Website add-on checkboxes |
| `extra_refrigerator_quantity` | How many extra refrigerators? | TextInput numeric | If selected | positive whole integer | quantity on `Extra Refrigerator` | Visible only if selected | Guided `EXTRA_REFRIGERATOR_QUANTITY`; Website quantity enhancement |
| `balcony_patio_quantity` | How many balcony/patio areas? | TextInput numeric | If selected | positive whole integer | quantity on `Balcony / Patio Cleaning` | Visible only if selected | Guided `BALCONY_PATIO_QUANTITY`; Website quantity enhancement |
| `eco_friendly_products` | Use eco-friendly products? | RadioButtonsGroup | No | `YES`, `NO` -> boolean; absence stays undefined | `request.ecoFriendlyProducts` | This is a preference, not a separate primary service | Guided `ECO_FRIENDLY_PRODUCTS` currently always asks; Website optional select |
| `laundry_requested` | Add Laundry | OptIn | No | boolean | presence of `request.laundry.laundryLoads` | Visible only for `REGULAR_HOME` or `DEEP` | Guided add-on choices 12/13; Website Laundry enhancement |
| `ironing_requested` | Add Ironing | OptIn | No | boolean | presence of `request.laundry.ironingLoads` | Visible only for `REGULAR_HOME` or `DEEP` | Guided add-on choices 12/13; Website Ironing enhancement |
| `laundry_facilities` | Laundry facilities | RadioButtonsGroup | If Laundry | `WASHER_DRYER`, `WASHER_LINE` | `request.laundry.facilities` | Help: “Laundry is done at your home and requires a working washing machine.” | Guided `LAUNDRY_FACILITIES`; Website `laundryFacilities` |
| `laundry_loads` | Laundry standard loads | TextInput numeric | If Laundry | positive whole integer | `request.laundry.laundryLoads` | No live price shown | Guided `LAUNDRY_LOADS`; Website `laundryLoads` |
| `ironing_loads` | Ironing standard loads | TextInput numeric | If Ironing | positive whole integer | `request.laundry.ironingLoads` | Help: “Please provide a safe working iron and ironing board. Specialist garment care is excluded.” | Guided `IRONING_LOADS`; Website `ironingLoads` |

Laundry/Ironing eligibility is authoritative in HestivaOS: currently only `Regular Home Cleaning` and `Deep Cleaning`. Flow visibility is convenience; the parser must reject hidden-field injection or an ineligible primary-service/laundry combination.

## Field contract — Screen 4: `PREFERRED_VISIT`

| Stable field ID | Label | Component | Required | Validation/options | Canonical destination | Conditional / help | Guided / Website |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `preferred_date` | Preferred date | DatePicker | Yes | real `YYYY-MM-DD`; UI should prevent past/today when provider capability permits | `visit.preferredDate` | Help: “This is a request; Homent confirms availability after review.” | Guided `PREFERRED_DATE`; Website `preferredDate` |
| `alternative_date` | Alternative date | DatePicker | No | real `YYYY-MM-DD` when supplied | `visit.alternativeDate` | Optional | Guided `ALTERNATIVE_DATE`; Website `alternativeDate` |
| `preferred_time` | Preferred time | Dropdown | Yes | `MORNING`, `MIDDAY`, `AFTERNOON`, `FLEXIBLE` | `visit.preferredTime` | None | Guided `PREFERRED_TIME`; Website `preferredTime` |
| `flexibility` | Flexibility | Dropdown | Yes | exact strings `Exact date preferred`, `A day either side`, `Flexible this week`, `Fully flexible` | `visit.flexibility` | Controlled presentation; HestivaOS still validates as required text | Guided `FLEXIBILITY` currently free text; Website controlled select |
| `urgency` | Urgency | Dropdown | Yes | exact strings `Planning ahead`, `Within two weeks`, `Within one week`, `As soon as possible` | `visit.urgency` | Controlled presentation | Guided `URGENCY` currently free text; Website controlled select |
| `recurring_notes` | Recurring schedule notes | TextArea | No | string | `visit.recurringNotes` | Visible only when resolved frequency is not `ONE_TIME` | Guided `RECURRING_NOTES`; Website `recurringNotes` |

The current canonical Quote validator checks calendar-date shape but does not itself enforce “tomorrow onwards”; the Website does. Flow V1 presents the Website rule, while final authoritative validation remains HestivaOS. The implementation step must not silently broaden HestivaOS domain rules to solve a DatePicker limitation.

## Field contract — Screen 5: `ACCESS_HOUSEHOLD`

| Stable field ID | Label | Component | Required | Validation/options | Canonical destination | Conditional / help | Guided / Website |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `complex_access` | Estate or complex access | Dropdown | Yes | `ACCESS_CODE`, `NOT_APPLICABLE`, `VISITOR_SIGN_IN`, `RESIDENT_ARRANGED` | `access.complexAccess` | If Access code: “Do not enter the code here. It can be shared securely for the confirmed visit.” | Guided `COMPLEX_ACCESS`; Website enhanced `complexAccess` |
| `security_instructions` | Security or gate instructions | TextArea | No | string | `access.securityInstructions` | Do not solicit a temporary access secret in the Flow | Guided `SECURITY_INSTRUCTIONS`; Website `securityInstructions` |
| `parking` | Parking instructions | TextArea | No | string | `access.parking` | None | Guided `PARKING`; Website `parking` |
| `key_handover` | Key handover method | Dropdown | Yes | `SOMEONE_WILL_OPEN`, `CONCIERGE_RECEPTION`, `TO_BE_ARRANGED` | `access.keyHandover` | None | Guided `KEY_HANDOVER`; Website enhanced `keyHandover` |
| `key_handover_details` | Explain the arrangement | TextArea | If `TO_BE_ARRANGED` | trimmed non-empty | `access.keyHandoverDetails` | Visible only when needed | Guided `KEY_HANDOVER_DETAILS`; Website enhanced field |
| `someone_present` | Will someone be present? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `access.someonePresent` | None | Guided `SOMEONE_PRESENT`; Website enhanced presence options |
| `has_pets` | Pets at the property? | RadioButtonsGroup | Yes | `YES`, `NO` -> boolean | `household.hasPets` | Help: “Tell us about pets so the team can arrive safely.” | Guided `HAS_PETS`; Website `pets` |
| `pet_type` | Pet type | Dropdown | If pets | `DOG`, `CAT`, `DOG_AND_CAT`, `BIRD`, `OTHER` | `household.petType` mapped to human string | Visible only if pets | Guided `PET_TYPE` free text; Website controlled `petType` |
| `pet_type_other` | Describe the pet | TextInput | If `pet_type=OTHER` | trimmed non-empty | `household.petType` | Visible only for Other | Guided free-text equivalent; Website does not currently add a separate Other detail control |
| `pet_temperament` | Pet temperament | Dropdown | If pets | `FRIENDLY`, `SHY`, `PROTECTIVE`, `REACTIVE`, `NOT_SURE` | `household.petTemperament` mapped to human string | Visible only if pets | Guided free text; Website controlled `petTemperament` |
| `off_limits_areas` | Off-limits rooms or cupboards | TextArea | No | string | `safety.offLimitsAreas` | Help: “Only mention areas the team should avoid.” | Guided `OFF_LIMITS_AREAS`; Website `offLimits` |
| `fragile_items` | Fragile surfaces or items | TextArea | No | string | `safety.fragileItems` | None | Guided `FRAGILE_ITEMS`; Website `fragileItems` |
| `product_restrictions_choice` | Cleaning-product restrictions? | RadioButtonsGroup | Yes | `NONE`, `DETAILS` | controls `safety.productRestrictions` | Concise help: “Tell us if a product or ingredient should not be used.” | Guided optional text; Website enhanced required choice |
| `product_restrictions_details` | Restriction details | TextArea | If `DETAILS` | trimmed non-empty | `safety.productRestrictions` | Visible only for details | Guided `PRODUCT_RESTRICTIONS`; Website enhanced details |
| `allergies_choice` | Allergies or sensitivities? | RadioButtonsGroup | Yes | `NONE`, `DETAILS` | controls `safety.allergiesOrSensitivities` | None | Guided optional text; Website enhanced required choice |
| `allergies_details` | Allergy or sensitivity details | TextArea | If `DETAILS` | trimmed non-empty | `safety.allergiesOrSensitivities` | Visible only for details | Guided `ALLERGIES_OR_SENSITIVITIES`; Website enhanced details |

`NONE` maps to omission/empty semantics, not the literal word “None” unless the canonical implementation specifically requires preservation of that customer wording. The future mapper must use one consistent representation and pass canonical validation.

## Field contract — Screen 6: `PHOTOS_NOTES`

| Stable field ID | Label | Component | Required | Validation | Canonical destination | Help / failure behavior | Guided / Website |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `quote_photos` | Optional quote photos | PhotoPicker | No | `min-uploaded-photos=0`, intended `max-uploaded-photos=10`, intended max `10 MiB` per image | canonical Quote-owned photos after secure retrieval/promotion | “Clear photos of rooms, build-up, damage or areas needing attention can help us review your request.” | Guided current main supports no-photo only; Website max 10 |
| `existing_damage` | Existing damage | TextArea | No | string | `safety.existingDamage` | None | Guided `EXISTING_DAMAGE`; Website `existingDamage` |
| `attention_areas` | Areas needing attention | TextArea | No | string | `notes.attentionAreas` | None | Guided `ATTENTION_AREAS`; Website `attentionAreas` |
| `renovation_dust` | Renovation or construction dust | TextArea | No | string | `notes.renovationDust` | None | Guided `RENOVATION_DUST`; Website `renovationDust` |
| `appliance_notes` | Appliance-related notes | TextArea | No | string | `notes.applianceNotes` | Use for details beyond selected add-ons | Guided `APPLIANCE_NOTES`; Website `applianceAddons` |
| `additional_notes` | Anything else we should know? | TextArea | No | string | `notes.additionalNotes` | Mapper appends this after structured property/service “Other” notes rather than overwriting them | Guided `ADDITIONAL_NOTES`; Website `notes` |

### PhotoPicker V1 policy

Photos are optional and PhotoPicker is independently disableable. The core Flow remains valid with `quote_photos` omitted and maps `photos: []`.

V1 intends at most **10 photos** and **10 MiB per photo**, matching the current Website selection boundary and remaining below ADR-0081's 20 MiB ordinary-provider-media ceiling and Meta's broader PhotoPicker limits. Accepted canonical image assumptions are JPEG, PNG, HEIC and HEIF where the provider returns enough trustworthy metadata/bytes to verify them. The future runtime must not trust a filename or provider handle as proof of type.

Flow PhotoPicker media is not ordinary inbound WhatsApp image media. The future runtime must use the verified Flow-media retrieval/decryption lifecycle, verify ownership/correlation/type/size/hash evidence where available, and promote only secured evidence into the existing private Quote-owned photo workflow. No provider temporary URL becomes durable Quote data, no public bucket is introduced, and no second permanent media copy is created merely for Messaging.

If PhotoPicker is disabled, unsupported or unhealthy, the non-photo Flow continues. If a submitted completion claims selected photos but one or more cannot be securely retrieved/verified, automation must **not silently discard the customer's intended evidence**. The Quote completion becomes ineligible for automatic finalization and must enter the defined recovery/`HUMAN_REVIEW` path without creating a duplicate Quote. Exact media-recovery persistence is deferred to the runtime slice.

## Field contract — Screen 7: `YOUR_DETAILS`

| Stable field ID | Label | Component | Required | Validation/options | Canonical destination | Help | Guided / Website |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `full_name` | Full name | TextInput | Yes | trimmed non-empty | `customer.fullName` | None | Guided `FULL_NAME`; Website `fullName` |
| `email` | Email address | TextInput email | Yes | simple email shape plus HestivaOS validation | `customer.email` | None | Guided `EMAIL`; Website `email` |
| `mobile` | Mobile number | TextInput phone | Yes | must normalize/validate to E.164; V1 customer help uses `+27...` example | `customer.mobile` | “Enter the number you want linked to this quote, for example +27821234567.” | Guided `MOBILE`; Website `mobile` |
| `preferred_contact` | Preferred contact method | Dropdown | Yes | `PHONE`, `EMAIL`, `WHATSAPP` | `customer.preferredContact` | None | Guided `PREFERRED_CONTACT`; Website `contactMethod` |

Provider identity is not canonical Customer identity and must not be silently used in place of `mobile`. V1 has no private Customer/Property prefill merely because the same WhatsApp identity launched the Flow.

The Website's browser contact-consent checkbox has no canonical Quote business-fact destination and is not copied into Flow V1 as a fake HestivaOS fact. WhatsApp customer initiation/provider policy and future outbound-consent requirements remain separate messaging policy boundaries.

## Screen 8: `REVIEW_SUBMIT`

The final screen is terminal and contains no business-fact input. It presents a concise review assembled from the customer's entered values, grouped as:

1. service, frequency and home condition;
2. property address/type/layout;
3. selected add-ons and Laundry/Ironing quantities;
4. preferred visit date/time/flexibility;
5. access, presence and pets;
6. safety/notes and selected photo count;
7. customer name/contact preference.

Long notes may be summarized/truncated for display, but the completion payload preserves the full entered values. The customer may use normal Flow back navigation to correct fields before submission where the provider permits it.

The terminal Footer label is **`Submit quote request`** and uses the Flow `complete` action. There is no chat `CONFIRM`/`CHANGE` step after a valid Flow completion.

Pressing Submit is customer authorization to send the collected request to HestivaOS; it is **not** authoritative Quote creation. After authenticated provider receipt, HestivaOS still resolves the exact Flow/session version, maps and validates all fields, applies pricing/business rules, and produces exactly one Quote or `HUMAN_REVIEW` result.

## Completion payload contract

The completion is accepted only from the existing authenticated WhatsApp webhook boundary as an interactive Flow completion (`nfm_reply`). The future parser must parse `response_json` once as provider payload data, then validate this contract without trusting client visibility or provider UI enforcement.

Required reserved completion metadata:

```json
{
  "homent_contract": "HOMENT_QUOTE_REQUEST_V1",
  "homent_mapping_version": "HOMENT_QUOTE_REQUEST_MAPPING_V1",
  "homent_completion_version": "HOMENT_QUOTE_REQUEST_COMPLETION_V1"
}
```

The provider-returned `flow_token` is required for correlation and must match exactly one unresolved HestivaOS Flow session. It is an opaque, high-entropy application-generated token containing no phone number, Customer ID, Property ID or other private business data. `flow_token` is **correlation, not authentication**; webhook authenticity remains the Meta signature boundary.

The durable future session must additionally bind the actual Meta Flow ID/name and `HOMENT_QUOTE_REQUEST_V1` semantics. A completion is rejected/fails closed when token, provider identity/conversation, Flow identity, contract version or mapping version conflicts with the session.

The completion payload contains the stable field IDs defined in this document. Conditional fields may be absent only when their condition is false. The parser derives canonical constants (`South Africa`, Duplex `TWO` storeys, once-off frequencies) from the same frozen V1 rules. Unknown fields are rejected or ignored only under an explicitly versioned forward-compatibility rule; V1 default is fail closed for fields that could affect business meaning.

Duplicate delivery of the same authenticated completion must replay the same logical submission identity and converge on the same Quote/`HUMAN_REVIEW` outcome. A changed payload under the same completion/session identity conflicts rather than creating another Quote.

## Authoritative parser rules

The future `HOMENT_QUOTE_REQUEST_MAPPING_V1` parser must:

1. require the exact contract/mapping/completion versions and the matching unresolved Flow session;
2. allow only the stable V1 values in this document;
3. reject missing required fields and unexpected conditional business fields;
4. derive only the explicitly frozen constants in this contract;
5. reject hidden-field contradictions, for example apartment-only fields on a House or Laundry facts for an ineligible service;
6. normalize the Flow presentation values to the existing canonical business facts without inventing a new Quote schema;
7. preserve free text verbatim after trimming except for the explicitly labelled notes-prefix composition;
8. run `validateQuoteBusinessFacts()` after mapping and treat it as authoritative validation;
9. apply existing HestivaOS pricing/business/review rules only after canonical validation;
10. never calculate or display authoritative price inside the Flow.

Client-side/Flow conditional visibility is never proof that a combination is valid.

## Exact conditional presentation rules

- `property_type = OTHER` -> show `property_type_other`.
- `property_type = APARTMENT` -> show `bedrooms_apartment`, `apartment_floor`, `apartment_access`; hide `bedrooms_other`, `storeys`.
- non-Apartment -> show `bedrooms_other`; `STUDIO` is unavailable.
- `TOWNHOUSE`, `HOUSE`, `OTHER` -> show `storeys`; `DUPLEX` derives two storeys; Apartment has no storeys field.
- service selection -> show only the appropriate frequency control; Move-In/Move-Out/Post-Event derive once-off.
- `NOT_SURE` -> show `service_not_sure_details` and use review-safe `canonicalService: null`.
- resolved frequency `CUSTOM` -> show `custom_frequency_note`.
- `POST_EVENT` -> show all Post-Event structured fields; those fields must be absent otherwise.
- `add_ons` contains `EXTRA_REFRIGERATOR` -> show quantity.
- `add_ons` contains `BALCONY_PATIO` -> show quantity.
- only `REGULAR_HOME` or `DEEP` -> show Laundry/Ironing opt-ins.
- Laundry selected -> show facilities and laundry loads.
- Ironing selected -> show ironing loads.
- non-once-off -> show `recurring_notes`.
- `key_handover = TO_BE_ARRANGED` -> show handover details.
- pets yes -> show pet type and temperament; pet type Other -> show `pet_type_other`.
- restriction/allergy choice Details -> show its details field.
- PhotoPicker remains optional and may be omitted entirely by a deployment feature gate without changing the non-photo mapping contract.

## Contextual help copy frozen for V1 meaning

Display wording may receive copy-only refinements without a mapping-version change, but the following meaning must be preserved:

- Regular vs Deep: **“Regular is routine upkeep; Deep is a more thorough clean for heavier build-up.”**
- Home condition: **“Choose the option closest to the home's condition now. Homent will still validate the request.”**
- Add-ons: **“Choose extras you want included. We'll only ask quantities where they apply.”**
- Laundry: **“Laundry is done at your home and requires a working washing machine.”**
- Preferred visit: **“Dates and times are requests until Homent confirms availability.”**
- Access code: **“Do not enter a temporary access code here. It can be shared securely for the confirmed visit.”**
- Pets: **“Tell us about pets so the team can arrive safely.”**
- Photos: **“Clear photos of rooms, build-up, damage or areas needing attention can help us review your request.”**
- Post-Event: **“Tell us about the event and cleanup so Homent can judge the workload. Specialist or unusual work may need review.”**

Help remains concise; it does not reproduce service manuals or pricing.

## Mid-Flow questions, interruption and restart contract

An offered/unresolved Flow session means only that HestivaOS knows a Flow was offered under a specific version. It does not prove the Flow was opened, viewed, started, abandoned or how many fields were entered.

Intended UX:

**Flow offered -> customer enters some information -> customer returns to normal WhatsApp chat -> asks a question -> automated/human assistance answers in normal chat -> customer reopens the same Flow message where practical.**

If the WhatsApp client preserves unfinished progress, that is a provider/client convenience. HestivaOS does not depend on it. If progress is lost, the customer gets a clean restart/re-offer of the same compatible V1 contract or a deliberate transition to fallback.

While an unresolved Flow session is active, ordinary inbound text/media is **normal chat/help**, not a Flow field and not a deterministic guided-collector answer. The guided collector becomes answer-active only after a deliberate fallback transition. Partial client-side Flow state never creates or mutates a canonical Quote.

No duplicate Flow session/Quote is created merely because the same launch message is reopened or assistance messages are exchanged.

## Fallback contract and parity

Primary path: **WhatsApp Flow**.

Fallback chain: **deterministic guided WhatsApp collector -> Website Quote form where appropriate -> human assistance**.

Messenger remains conversational and is not redesigned around WhatsApp Flow.

Flow uses the same canonical destination fields as the guided collector wherever the collector currently has an equivalent. Known current fallback parity gaps are documented rather than hidden:

- guided primary-service choices still expose legacy `Laundry Folding`, `Apartment Cleaning` and `Eco-Friendly Cleaning` primary options that V1 Flow does not expose;
- guided Home collection currently does not collect Website storeys or postal code;
- guided Not-sure Service does not currently collect the Website-style service description;
- guided flexibility/urgency are free text whereas Flow/Website use controlled customer choices;
- guided pet type/temperament are free text whereas Flow/Website use controlled presentation;
- guided current `main` supports the no-photo answer but not the planned Flow PhotoPicker lifecycle;
- Website client code still limits Bedroom/Living Area frequency differently from the current HestivaOS v2 domain allowance;
- Website has optional GPS/location convenience and a browser contact-consent UI that are not canonical Flow business facts.

These differences are implementation/presentation parity work for later slices. Step 3 does not mutate the existing guided collector or Website.

## Versioning rules

### Identifiers

- Business/presentation contract: `HOMENT_QUOTE_REQUEST_V1`
- Meta Flow JSON schema target: `7.3`
- Parser/mapping contract: `HOMENT_QUOTE_REQUEST_MAPPING_V1`
- Completion payload: `HOMENT_QUOTE_REQUEST_COMPLETION_V1`

### Change classification

**Display-text-only update:** spelling, grammar, concise help wording, non-semantic title/caption changes. Stable IDs, options, requiredness, conditions and mappings remain identical. A new HestivaOS mapping version is not required. If Meta publication requires a new provider Flow artifact, the new artifact remains semantically `HOMENT_QUOTE_REQUEST_V1` and sessions remain bound to its exact provider Flow ID.

**New mapping version:** parser normalization/correlation/provenance representation changes while the customer-visible field semantics and canonical business facts remain compatible. Create `HOMENT_QUOTE_REQUEST_MAPPING_V2`; never reinterpret stored V1 sessions with V2.

**New Flow contract version:** add/remove a business-significant field, change stable field IDs, options, requiredness, conditional meaning, review/submission semantics or PhotoPicker business behavior. Create `HOMENT_QUOTE_REQUEST_V2` and bind new sessions to V2. V1 sessions continue using V1 parser semantics.

**HestivaOS domain decision required:** any change to canonical Quote facts, service/frequency eligibility, pricing, review triggers, Customer identity authority, security/retention, accepted operational meaning, or whether a fact is required for the business rather than only for Flow presentation. Such changes require the appropriate domain documentation/ADR/coordination before the Flow is changed.

Published provider Flow artifacts are never treated as mutable semantic pointers. Session records must identify the exact provider artifact plus contract/mapping version.

## Contract test plan / fixtures

The runtime implementation must make the following fixtures executable before production launch:

| Fixture | Expected contract result |
| --- | --- |
| `normal-house` | valid House, storeys, Regular one-time, no extras -> canonical valid |
| `apartment` | Apartment with Studio allowed, exact floor/access -> canonical valid |
| `recurring-service` | Regular/Bedroom/Living recurring frequency -> canonical valid under current domain rules |
| `once-off-service` | Move-In/Move-Out/Post-Event derives `ONE_TIME`; injected recurring value rejected |
| `custom-frequency` | Custom requires non-empty custom note |
| `pets` | pets=true requires type/temperament; pet fields injected when false rejected |
| `add-ons` | supported generic add-ons map exactly; unsupported quantity rejected |
| `laundry-valid` | Regular/Deep + supported facilities/positive loads maps structured laundry |
| `laundry-ineligible` | Laundry/ironing under another primary is rejected despite client visibility rules |
| `not-sure` | canonical Service null plus description -> review-safe/HUMAN_REVIEW according to Quote rules, never guessed |
| `no-photos` | omitted/empty PhotoPicker -> `photos: []`, core Quote remains valid |
| `photos-present` | handles remain provider media references until secure retrieval; successful promotion produces canonical Quote evidence |
| `photo-retrieval-failure` | selected photo cannot be secured -> do not silently drop; recovery/HUMAN_REVIEW, no duplicate Quote |
| `interrupted-restarted` | no partial Quote from client-side progress; safe same-version restart/fallback |
| `duplicate-completion` | same authenticated completion/session -> same business result, exactly one Quote |
| `changed-replay` | same logical completion identity with changed business payload -> conflict/fail closed |
| `old-flow-version` | V1 completion after V2 deployment still parsed using bound V1 semantics |
| `unsupported-mapping-version` | fail closed; no Quote |
| `malformed-field` | invalid type/format -> fail closed; no blind coercion |
| `hidden-field-contradiction` | e.g. House + apartment floor, non-Post-Event + Post-Event facts, ineligible Laundry -> rejected |
| `missing-required` | missing required V1 field -> fail closed/no Quote |
| `unsupported-option` | unknown enum/checkbox value -> fail closed/no Quote |
| `human-review` | supported Not-sure/unsafe canonical outcomes reach existing `HUMAN_REVIEW` rather than invented business facts |
| `tampered-metadata` | wrong contract/mapping/completion version or mismatched token/Flow identity -> fail closed |

Future tests must feed mapped results through `validateQuoteBusinessFacts()`; passing a Flow UI/JSON validator alone is never sufficient.

## Release gate for the Flow artifact

Before any V1 provider artifact becomes customer-facing:

1. Meta Flow JSON schema validation must succeed for the exact artifact;
2. Meta preview/draft testing must cover every conditional branch;
3. HestivaOS mapping/fixture tests above must pass;
4. current supported WhatsApp clients must be tested on real devices;
5. interruption/reopen/restart behavior must be smoke-tested without assuming persistence;
6. unsupported/unhealthy Flow launch must reach the fallback path;
7. duplicate completion/replay must be exercised;
8. PhotoPicker must be tested independently and may remain disabled while the non-photo Flow launches.

## Step 3 freeze boundary

This document freezes V1 sufficiently for the next slice to design durable Flow-session persistence and completion correlation without guessing customer fields or business mappings. It deliberately does **not** choose database table names/columns, Meta Flow ID, token storage implementation, health-check cadence, provider-media recovery schema, or production launch date.