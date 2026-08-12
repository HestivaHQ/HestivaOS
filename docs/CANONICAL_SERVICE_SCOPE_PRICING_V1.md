# Hestiva Canonical Service Scope & Pricing Specification v1

**Status:** Approved product/business specification for migration

**Decision cutoff:** 2026-08-12

**Purpose:** This document is the canonical source for Hestiva residential service catalogue semantics, pricing, scope, staffing, quote safeguards, customer-policy logic, supervisor assessment rules, FAQ derivation and cleaner/supervisor checklist derivation. It supersedes conflicting earlier product intent while preserving historical ADRs and records.

---

## 1. Canonical modelling rules

### 1.1 Service vs property/context/preference

The canonical catalogue must contain real operational services/capabilities, not UI pseudo-options.

- **Apartment** is a property type/context, not a cleaning service.
- **Eco-Friendly** is a product/preference flag on compatible services, not a standalone service.
- **Add-On Services** is a UI/catalogue grouping, not a bookable Service or Work Order service type.
- **Multiple Services Required** is a UX path only; it must resolve to actual services/add-ons before quote/work-order creation.
- **Other / Something else** remains a customer-facing escape hatch but is not a canonical service and cannot be automatically priced. It routes to Admin review.
- Historical service IDs/relationships must be preserved safely. Do not silently destroy or remap historical data.

### 1.2 Canonical primary services

The primary service set includes:

- Regular Home Cleaning
- Deep Cleaning
- Move-In Cleaning
- Move-Out Cleaning
- Kitchen Cleaning
- Bathroom Sanitisation
- Bedroom Cleaning
- Living Area Cleaning
- Interior Window Cleaning
- Post-Renovation Cleaning

### 1.3 Add-on-only capabilities / property features

The following are not standalone primary bookings unless separately stated:

- Laundry
- Ironing
- Balcony / Patio Cleaning
- Pantry cleaning where used as an add-on
- Oven Interior Cleaning
- Fridge / Freezer Interior Cleaning
- Extractor Hood Cleaning
- Garage Cleaning
- Linen change outside already-included bedroom scope
- Other approved add-ons implemented from the canonical add-on catalogue

### 1.4 Laundry supersession

The prior `Laundry Folding` dual-context/primary semantics are superseded.

Laundry is **add-on only** and may attach only to a qualifying whole-home cleaning booking. It must not be selected or persisted as a standalone/primary booking.

---

## 2. Regular Home Cleaning pricing

The base price includes the normal bedroom/bathroom configuration expected for the floor-size band. Do not automatically stack ordinary bedroom/bathroom charges on top of the floor-size base.

| Floor area | Regular Cleaning base price |
|---|---:|
| Under 40 m² | R650 minimum |
| 40–59 m² | R700 |
| 60–79 m² | R750 |
| 80–99 m² | R800 |
| 100–129 m² | R875 |
| 130–169 m² | R975 |
| 170–219 m² | R1,050 |
| 220–299 m² | R1,200 |
| 300+ m² | From R1,350; unusually large/complex properties may require review |

### 2.1 Unusual room configuration modifiers

These modifiers apply only when a property has more than the normal allowance expected for its floor-size band:

- Additional bathroom above expected configuration: **+R75 each**
- Additional bedroom above expected configuration: **+R50 each**
- Additional living area above expected configuration: **+R50 each**

### 2.2 Condition rule

Regular Cleaning assumes a normally maintained home.

Customers do not self-price `Extra Attention` / `Heavy Buildup` using customer-selected surcharges. If actual condition materially exceeds Regular Cleaning scope, Hestiva may reassess before performing extra work. Any material price/service change requires customer approval before additional chargeable work begins.

---

## 3. Deep Cleaning pricing and staffing

Deep Cleaning is not derived by a simple Regular Cleaning multiplier. It has its own ladder and staffing model.

| Floor area | Deep Cleaning base | Normal staffing |
|---|---:|---:|
| Under 40 m² | R1,000 minimum | 2 cleaners minimum |
| 40–59 m² | R1,050 | 2 |
| 60–79 m² | R1,150 | 2 |
| 80–99 m² | R1,250 | 2 |
| 100–129 m² | R1,350 | 2 |
| 130–169 m² | R1,550 | 3 |
| 170–219 m² | R1,700 | 3 |
| 220–299 m² | R1,900 | 3 normally; 4 where workload requires |
| 300+ m² | From R2,200 | 4+; final price/workload review |

Deep Cleaning receives **no recurring-service discount**.

---

## 4. Move-In and Move-Out Cleaning

Move-In Cleaning minimum staffing is 2 cleaners. Move-Out uses the **same base ladder and staffing model** as Move-In; actual abnormal workload is handled only when present.

| Floor area | Move-In / Move-Out base | Normal staffing |
|---|---:|---:|
| Under 40 m² | R1,200 minimum | 2 minimum |
| 40–59 m² | R1,250 | 2 |
| 60–79 m² | R1,350 | 2 |
| 80–99 m² | R1,450 | 2 |
| 100–129 m² | R1,550 | 2 |
| 130–169 m² | R1,750 | 3 |
| 170–219 m² | R1,900 | 3 |
| 220–299 m² | R2,100 | 3 normally; 4 where workload requires |
| 300+ m² | From R2,450 | 4+; final workload review |

### 4.1 Included turnover scope

Move-In / Move-Out Cleaning includes by default:

- Interior cleaning of empty built-in kitchen cupboards/cabinets/drawers
- Interior cleaning of empty built-in wardrobes
- Oven interior, where present
- Fridge/freezer interior, where appliance remains
- Safely accessible interior windows, interior frames and sills
- Normal balcony / small patio where present

A property presented as vacant/turnover but materially occupied/packed is a scope mismatch and may require reassessment.

### 4.2 Turnover exclusions / workload features

- Large terrace or substantial outdoor area: workload input / possible price increase
- Exterior/high-level windows, roof/skylight access, façade work, specialist equipment, unsafe ladder work: excluded
- Pressure washing, garden work, specialist outdoor restoration: excluded
- Garage: optional separately priced property feature, not automatically included

---

## 5. Post-Renovation Cleaning

Post-Renovation Cleaning remains a **PRIMARY SERVICE**.

### 5.1 Current v1 customer-pricing decision

Post-Renovation Cleaning is **assessment/quote-required for v1**, not an automatic fixed-price/instant-quote service.

Earlier discussion approved an R40/m² formula, R1,500 minimum and residue modifiers. The later approved decision supersedes those as an automatic customer-facing pricing model for v1. They must not be exposed as a binding instant quote unless a future approved ADR explicitly reinstates a deterministic model.

### 5.2 Scope boundaries

Post-Renovation Cleaning must have a dedicated checklist and assessment. Explicit exclusions unless separately supported include:

- Builder's rubble / construction-waste removal
- Hazardous material handling
- Specialist removal of paint, cement, adhesive or residues requiring specialist treatment
- Unsafe or specialist restoration work

### 5.3 Blind assessment concept retained

Supervisors assess operational workload without seeing customer price, margins or price-adjustment percentages. HestivaOS/Admin converts the operational assessment into commercial consequences.

---

## 6. Kitchen Cleaning

### 6.1 Standard Kitchen Cleaning

| Kitchen size | Price |
|---|---:|
| Standard | R600 |
| Large | R700 |
| Extra-large / complex | R800+ |

Standard Kitchen Cleaning includes ordinary accessible kitchen cleaning such as:

- Countertops
- Sink and taps
- Backsplash
- Stovetop surface
- Appliance exteriors
- Cupboard/drawer exteriors
- Accessible surfaces
- Floors
- Microwave exterior

Standard Kitchen Cleaning does **not** automatically include cupboard/drawer interiors, oven interior, fridge interior or other separately defined deep appliance work.

### 6.2 Deep / Detailed Kitchen Cleaning

| Kitchen workload band | Base price |
|---|---:|
| Standard | R950 |
| Large | R1,200 |
| Extra-large / complex | From R1,500 / assessment |

Deep Kitchen includes cupboard/drawer interiors and ordinary contents handling:

- Remove ordinary contents systematically
- Clean interior surfaces
- Replace contents approximately where they were
- **Organisation is excluded**
- Microwave interior + exterior included

Oven interior and fridge interior remain separately priced unless included by a broader service such as Move-In/Move-Out.

### 6.3 Deep Kitchen cabinetry/pantry workload adjustment

Supervisor sees only workload descriptions/evidence, never price consequences.

- Level A — Normal cabinetry workload: **0%**
- Level B — High cabinetry workload: **+15%**
- Level C — Very high cabinetry workload: **+30%**; Admin review where needed

Customer-facing result follows the final upward-to-next-R10 rounding rule.

---

## 7. Pantry

Basic pantry cleaning pricing:

- Small / cupboard-style pantry: **+R75**
- Standard walk-in pantry: **+R150**
- Large walk-in pantry: **+R250**

Basic pantry scope covers accessible shelving/surfaces and floors without unloading/repacking all contents.

For Deep/Detailed Kitchen Cleaning, deep pantry work is part of the Deep Kitchen workload model rather than a separate stacked deep-pantry fee. Contents may be removed/replaced similarly to kitchen cabinetry; organisation is excluded.

---

## 8. Bathroom Sanitisation

- First standard bathroom / standalone minimum: **R550**
- Each additional standard bathroom: **+R200**
- Guest toilet / half-bath: **+R100**
- Large master/luxury bathroom: **+R300** instead of +R200

Standard sanitisation covers the normal bathroom scope: toilet, bath/shower, basin, taps, mirrors, surfaces, tiles/accessibly affected areas, floors and disinfection.

Heavy mould, grout restoration and specialist treatment are outside standard scope.

---

## 9. Bedroom Cleaning

- First standard bedroom / standalone minimum: **R450**
- Each additional standard bedroom: **+R150**
- Large/master bedroom: **+R225**

HestivaOS must prevent room-only combinations from being used to reconstruct an equivalent Regular Home Clean below the Regular Cleaning minimum/economics.

### 9.1 Bed-making and linen

Bedroom Cleaning includes normal bed-making and changing linen when clean replacement linen is provided and clearly available.

Removed linen is placed in the customer's laundry basket/designated location. Washing/drying/ironing is not included; those use Laundry/Ironing rules.

Extra bed linen change outside the purchased room-cleaning scope:

- Standard bed: **R40**
- Large/complex bed: **R60**

### 9.2 Wardrobes

- Standard Bedroom Cleaning: wardrobe exterior / accessible exposed surfaces
- Already-empty wardrobe: accessible interior wiping may be included
- Occupied wardrobe: no removal/repacking/organisation service in v1

---

## 10. Living Area Cleaning

- First standard living area / standalone minimum: **R450**
- Each additional standard living area: **+R150**
- Large/open-plan living area: **+R225**

Standard scope includes accessible dusting/wiping, entertainment-unit exterior, tables, furniture exterior dusting, vacuuming/sweeping/mopping and ordinary tidying within scope.

### 10.1 Specialist textile exclusions

Hestiva does not currently provide specialist:

- Couch/upholstery extraction/deep cleaning
- Mattress specialist cleaning/vacuuming
- Curtain washing/steam cleaning/stain treatment/removal/rehanging

Normal safe light dusting of curtains can remain within ordinary cleaning scope where appropriate.

---

## 11. Interior Window Cleaning

Standalone/interior service pricing:

- Minimum **R400**, includes up to 6 standard accessible interior windows
- Additional standard window: **+R40 each**
- Large window / glass door: **+R60 each**
- Oversized glass panel: assess as multiple units

Included: safely accessible interior glass, interior frames and sills.

Excluded: exterior high-level windows, roof glass, rope access, specialist height work, unsafe ladder work or specialist exterior equipment.

The universal break-even safeguard can raise the final standalone quote above the R400 component price where deployment economics require it.

---

## 12. Laundry and Ironing

Laundry and ironing are add-on only to qualifying whole-home cleaning bookings.

### 12.1 Laundry facilities logic

- Washing machine + tumble dryer: **Wash, Dry & Fold**
- Washing machine but no dryer: **Wash & Hang** on customer's washing line/drying rack; do not promise folding of line-dried laundry within the same visit
- No washing machine: laundry add-on unavailable
- No off-site laundry in v1
- Use customer's on-site laundry equipment

### 12.2 Laundry pricing

- Wash, Dry & Fold: **R175 per standard machine load**
- Wash & Hang: **R125 per standard machine load**

One standard load means one normal household washing-machine cycle/load, subject to machine capacity and safe loading.

HestivaOS must limit accepted loads according to expected job duration so the promised outcome is operationally achievable.

### 12.3 Ironing

- Ironing: **R150 per standard load**
- May be selected with laundry or for already-clean/dry clothes
- Not standalone
- Customer provides a safe, working iron and ironing board
- Special-care garments requiring professional pressing, dry cleaning or specialist garment care are excluded
- HestivaOS caps loads according to labour/time capacity

---

## 13. Balcony / Patio Cleaning

Balcony Cleaning is add-on only for ordinary cleaning bookings.

- Standard balcony: **+R100**
- Large balcony: **+R175**
- Very large terrace: **+R250**

Normal sweeping, surface wiping and appropriate mopping/washing are included.

Excluded / assessment-required:

- Heavy bird-dropping accumulation
- Severe staining
- Pressure washing
- Exterior façade/glass specialist work
- Specialist restoration

Normal balcony/small patio is included by default in Move-In/Move-Out as defined above.

---

## 14. Garage Cleaning

Garage Cleaning is optional, not automatically included in Move-In/Move-Out.

- Empty standard single garage: **R250**
- Empty double garage: **R400**
- Larger/multi-car garage: **assessment**

Normal sweeping, accessible surface dusting/wiping and appropriate floor cleaning are included.

Excluded:

- Oil/chemical stain specialist removal
- Hazardous materials
- Heavy storage removal
- Pressure washing
- Specialist floor treatment

---

## 15. Appliance add-ons

### 15.1 Oven Interior

- Standard single oven: **R350**
- Double/large oven: **R500**
- Severe baked-on grease: **+R150** workload adjustment

Oven racks/trays belonging to the oven are included. Specialist disassembly is not implied.

### 15.2 Fridge / Freezer Interior

- Standard fridge: **R300**
- Large fridge/freezer combination: **R400**
- Large side-by-side/French-door unit: **R500**
- Severe condition: **+R100** workload adjustment

Ordinary contents handling is included. Work section-by-section to avoid leaving perishables out unnecessarily. Spoiled/leaking food or seriously unhygienic conditions can trigger assessment/escalation.

### 15.3 Extractor Hood

- Standard extractor hood: **R200**
- Large/heavily greased extractor: **R300**

Covers accessible exterior/interior surfaces and removable washable filters.

Excluded: duct cleaning, motor/electrical disassembly, electrical repair or specialist servicing.

### 15.4 Microwave

No separate microwave charge.

- Standard Kitchen: microwave exterior included
- Deep/Detailed Kitchen: microwave interior + exterior included

---

## 16. Eco-Friendly preference

Eco-Friendly is a preference on compatible services, not a standalone service.

- Customer surcharge: **R0** at launch
- HestivaOS should still track actual consumables cost internally
- Universal break-even protection remains applicable

Future procurement evidence may trigger a separate approved review; do not silently invent a percentage surcharge.

---

## 17. Recurring Regular Cleaning

Recurring discount applies to the **Regular Cleaning base service only**, not automatically to add-ons.

- Weekly: **10% off**
- Fortnightly: **7.5% off**
- Monthly: **5% off**

The first recurring clean is full price. The recurring discount begins from the **second qualifying completed clean**.

The discount must never defeat the universal profitability floor or the approved minimum-price logic. HestivaOS may reduce the effective discount if needed to avoid an unprofitable booking.

---

## 18. Universal quote economics and rounding

### 18.1 Universal break-even safeguard

Every quote must pass an internal minimum-contribution / break-even test before it is issued.

At minimum, the internal model must account for the approved cost categories relevant to the booking, including:

- Cleaner labour
- Address-based transport/deployment cost
- Chemicals/consumables
- Equipment/vehicle reserve
- Applicable overhead allocation

The customer sees the final all-inclusive quote, not Hestiva's internal cost/margin breakdown.

The safeguard applies system-wide to core services, standalone room services and add-on combinations.

### 18.2 Published `from` pricing

Published `from` prices must be genuinely attainable for qualifying bookings. They are not fake marketing values.

Actual final price can increase based on real property workload, address/deployment economics and approved modifiers.

### 18.3 Customer-facing rounding

HestivaOS calculates precisely internally, then rounds the **final customer price upward to the next R10**.

Examples:

- R1,231 → R1,240
- R1,240 → R1,240
- R1,241 → R1,250
- R897 → R900

Do not round downward.

---

## 19. Floor-size uncertainty / property intelligence

If the customer knows the floor size, use it.

If the customer selects **Not sure**, HestivaOS may use the property address and approved property-information workflow to estimate size. The system may use high-confidence property/listing/context evidence as designed; low-confidence cases require Admin verification rather than silently binding a quote to an uncertain estimate.

Post-Renovation and other high-value/variable work require stricter verification and/or assessment as defined in their service rules.

---

## 20. Supervisor blind-assessment principle

Supervisors assess operational facts/workload, not money.

A supervisor must not need access to:

- Customer price
- Internal margins
- Cost breakdown
- Price-adjustment percentages
- Resulting commercial adjustment

Supervisor workflow records objective operational observations/evidence. HestivaOS/Admin converts approved assessment inputs into pricing/staffing consequences.

This separation of duties applies to relevant condition/workload models including Deep Kitchen and other future workload assessments.

---

## 21. Material on-site scope/price changes

If actual conditions materially differ from the confirmed booking, the supervisor records the facts and HestivaOS recalculates without exposing prices to the supervisor.

A customer must explicitly approve any material price/scope increase before the additional work begins.

Material-change threshold: **the greater of R100 or 10% of the confirmed booking price**.

Below that threshold, Hestiva absorbs normal estimating variance.

### 21.1 Payment handling after approved increase

Do **not** collect a second deposit merely to restore a 50/50 split.

Example:

- Confirmed booking R1,000
- Deposit paid R500
- Revised/approved total R1,300
- Final completion balance = **R800**

The entire approved increase is collected with the completion balance.

### 21.2 Downward variance vs Hestiva error

- Ordinary favourable workload variance does **not** automatically reduce the confirmed price.
- A genuine Hestiva quoting/calculation/system/admin error **must be corrected**.
- If the customer overpaid because of Hestiva error, refund the overcharge. Do not force store credit unless the customer chooses it.

---

## 22. Payment terms

Default residential model:

- **50% deposit to confirm booking**
- **50% due immediately on recorded completion**

Large/custom jobs may have an Admin-approved deposit rule where justified.

### 22.1 Completion definition

A job is considered completed when the assigned cleaner/supervisor completes the HestivaOS checklist, records relevant exceptions/issues and submits the job as completed.

The outstanding balance becomes due immediately at that point.

Quality complaints are handled through the service-recovery workflow and do not automatically suspend payment unless Admin authorises it.

### 22.2 Card pre-authorisation target architecture

Preferred future card flow where supported by the selected payment provider:

- 50% deposit charged at booking
- Remaining balance pre-authorised/reserved shortly before service where feasible
- Capture on verified completion

EFT cannot provide the same card-hold protection; EFT balance remains immediately due on completion.

Do not store raw card details in Hestiva systems; use payment-provider tokenisation/reference mechanisms.

Gateway/provider selection is not yet canonical and requires a separate implementation decision.

### 22.3 Unpaid balances

- Cleaner/supervisor leaves normally; field staff do not act as debt collectors
- Customer account with an outstanding balance is blocked from future bookings
- Automated reminders/escalation may occur
- Persistent debt routes to Admin
- Field staff must not negotiate collection or threaten customers

---

## 23. Cancellation, rescheduling and access

### 23.1 Customer cancellation

- More than 24 hours before appointment: free cancellation/reschedule
- 12–24 hours: **25% cancellation fee**
- Less than 12 hours / same-day: **50% cancellation fee**
- No-access/no-show after the defined access procedure: **100% of booking**

Genuine exceptional circumstances may be waived only by authorised Admin with reason recorded.

If Hestiva cannot fulfil the booking, customer receives full refund or free reschedule; never charge a cancellation fee for Hestiva's failure.

### 23.2 Customer access grace period

- Maximum access grace period: **30 minutes**
- Customer-caused waiting consumes the reserved service window; the original end time does not automatically move
- If access is achieved during the grace period, service proceeds within remaining reserved time unless an authorised paid extension is available and approved
- No access after 30 minutes: no-access/no-show procedure

### 23.3 Hestiva lateness

- Expected delay >15 minutes: proactively notify customer with revised ETA
- Hestiva delay of 30+ minutes: customer may continue or reschedule without penalty
- Hestiva-caused lateness never reduces the cleaning time/scope the customer paid for
- Serious/repeated failures may receive Admin-approved service recovery/credit; do not auto-discount every minor delay

---

## 24. 24-hour Service Quality Guarantee

Customer may report a specific cleaning deficiency within **24 hours of completion**.

Rules:

- Complaint must concern work actually included in purchased scope
- Hestiva gets the first right to remedy the affected area at no charge
- Do not automatically redo the entire property for a localised issue
- Pre-existing damage, permanent staining/material damage, inaccessible areas and excluded specialist work are not workmanship failures
- Photos may be requested where reasonably necessary
- If a valid issue cannot reasonably be resolved after a remediation attempt, Admin may approve an appropriate partial/full refund or credit
- Do not advertise an automatic blanket `100% money-back guarantee`

Cleaner/supervisor checklists are evidence of promised scope and completion.

---

## 25. Damage / breakage incident policy

Hestiva does not use a blanket `no responsibility for breakages` rule.

Operational workflow for suspected Hestiva-caused accidental damage:

1. Stop handling the item/area where appropriate.
2. Record incident details and reasonable photographic evidence in HestivaOS.
3. Cleaner immediately reports to supervisor.
4. Supervisor verifies/escalates.
5. Customer is informed rather than damage being concealed.
6. Admin manages investigation and remedy.

Field staff must not:

- Hide damage
- Privately pay the customer
- Promise a replacement or fixed compensation
- Admit a specific monetary liability on behalf of the company
- Negotiate a private settlement

Incident categories:

- Hestiva-caused damage
- Pre-existing damage
- Inherent fragility/deterioration / weak or unsafe material
- Undetermined/disputed damage

Visible material pre-existing damage should be documented where practical before work.

### 25.1 Insurance and legal-review gate

Suitable public-liability/business insurance is a **mandatory pre-launch gate before cleaners are dispatched to customer properties**.

Insurance review must specifically verify:

- Cleaning operations at customer premises
- Third-party property damage
- Third-party bodily injury
- Property being worked on / care, custody and control exclusions
- Appropriate liability limits and excesses
- Claim/legal defence terms

Do not set arbitrary liability caps in customer T&Cs without insurance-policy alignment and legal review.

---

## 26. Valuables, sensitive items and prohibited handling

Hestiva cleans homes; it does not take custody of unusually valuable/sensitive possessions as part of ordinary cleaning.

Customers should secure items such as:

- Cash
- Jewellery
- Bank cards
- Important/confidential documents
- Medication
- Sensitive keys/remotes
- Collectibles and other high-value items

Ordinary belongings such as normal decor, dishes, toiletries, groceries and ordinary clothing may be moved reasonably where needed and returned approximately to their original position, subject to specific service rules.

Staff must not unnecessarily handle dangerous/sensitive items such as:

- Firearms/weapons
- Illegal/suspected illegal substances
- Needles/sharps
- Biological waste
- Hazardous chemicals/materials
- Anything reasonably considered unsafe

Discovery triggers the supervisor/safety process as appropriate.

Do not unnecessarily photograph a valuable/sensitive item itself. Record the operational exception without creating avoidable privacy/security risk where possible.

Checklist exception reason should support a value equivalent to **Area inaccessible — customer belongings/sensitive item**.

An area not cleaned because staff correctly followed this safety rule is not a workmanship failure.

This preparation/handling policy does not remove Hestiva responsibility for genuine employee-caused damage, theft or misconduct.

---

## 27. Specialist service exclusions in v1

Unless a future approved service explicitly introduces them, Hestiva does not provide:

- Specialist couch/upholstery extraction/deep cleaning
- Specialist mattress cleaning/vacuuming
- Specialist curtain washing/steam cleaning/stain treatment/removal/rehanging
- High-access/exterior specialist window cleaning
- Pressure washing
- Hazardous-material cleanup
- Builder's rubble removal
- Specialist garment pressing/dry cleaning
- Specialist appliance repair/servicing
- Specialist restoration/treatment not included in the defined cleaning scope

---

## 28. FAQ derivation rule

The website FAQ should be **derived from this specification**, not brainstormed independently.

Strong FAQ candidates include:

- What is included in Regular Cleaning vs Deep Cleaning?
- What is included in Deep Kitchen Cleaning?
- Do I need to empty kitchen cupboards?
- Do you clean inside fridges and ovens?
- Are inside windows included?
- Do you clean couches, mattresses or curtains?
- Can you do laundry if I do not have a dryer?
- Is ironing available?
- Do I need to provide an iron/board?
- What happens if I am not home / cannot provide access?
- What happens if Hestiva is late?
- How does the 50% deposit work?
- What happens if I am unhappy with the clean?
- Can I reschedule/cancel?
- Why can my final quote be above an advertised `from` price?
- What happens if the actual property/workload is materially different from the booking information?

Do not expose internal break-even formulas, margin thresholds, supervisor price-blind controls or internal workload coefficients in customer FAQ content.

---

## 29. Cleaner and supervisor checklist derivation

Cleaner and supervisor checklists must be generated from the canonical service scopes and exclusions in this document.

Do not reinvent service scope when checklist work begins.

Checklist architecture must support at least:

- Service-specific included tasks
- Service-specific excluded/specialist tasks
- Property-feature/add-on tasks
- Completion state
- Exception reason
- Safety/inaccessible reason
- Damage/incident escalation
- Before/after evidence where operationally required
- Supervisor blind workload assessment where applicable

---

## 30. Migration requirements

This specification must drive coordinated changes across:

- Hestiva website quote/service UX
- Website → HestivaOS contract and value mapping
- Canonical Service catalogue
- Service/add-on semantics and validation
- Pricing engine / quote calculations
- Work Order representation
- Recurring-service logic
- Admin/supervisor views
- Customer policies/FAQ/tooltips
- Cleaner/supervisor checklist system
- Tests
- Permanent documentation / ADR supersession

### 30.1 Existing architecture known to conflict

The migration must deliberately supersede conflicting semantics including:

- Website `Laundry Folding` primary-service option
- Website `Apartment Cleaning` as a service
- Website `Eco-Friendly Cleaning` as a service
- Website `Add-On Services` as a service
- Website `Multiple Services Required` as a service
- `Other` as a canonical service identity
- ADR-0024 Laundry Folding `BOTH` semantics
- Earlier ADR-0018 assumptions where incompatible with this specification
- Old job-type mappings that mix property type, scope, add-ons and free-text pseudo-options

Historical ADRs should remain historically truthful; create a superseding ADR rather than rewriting history.

---

## 31. Remaining implementation/pre-launch decisions (not pricing-discovery blockers)

The following remain implementation or launch tasks, not reasons to reopen the completed pricing discovery workflow:

- Select final South African payment gateway/provider and implement card pre-authorisation if supported
- Obtain suitable public-liability/business insurance and verify actual policy wording
- Legal review of final customer T&Cs, liability wording and debt-recovery/escalation procedure
- Implement exact property-address/floor-size estimation confidence logic
- Build cleaner/supervisor checklist content from this specification
- Build customer FAQ/policy copy from this specification
- Define technical schema/migrations and historical-data handling without destructive remapping

---

## 32. Supersession principle

When this document conflicts with older product-intent documentation for service catalogue, service scope, pricing or commercial policy, this document represents the later approved business decision for the migration. Historical implementation facts remain facts until changed in code/database, and historical ADRs remain historical records.
