# Post-Event Cleaning v1

## Status

Approved product/business specification for implementation.

The first two runtime slices now implement the deterministic Quote-domain workload/preliminary-price resolver and integrate structured internal Post-Event facts into the shared Quote pricing and approved cleaner-hour operational-cost paths. External Website/Messaging collection, service seeding, Work Order/checklist integration and customer-facing UI remain follow-up work and are not claimed as implemented yet.

Decision date: 2026-08-23.

This document defines the first Homent Post-Event Cleaning offering. It supplements `CANONICAL_SERVICE_SCOPE_PRICING_V1.md` and is the current authority for Post-Event Cleaning until the next canonical service-spec reconciliation incorporates it directly.

## Service identity

- Canonical primary service: **Post-Event Cleaning**.
- Frequency: **once-off only** in v1.
- It is a real operational primary service, not an add-on, property type, preference or UI pseudo-option.
- Initial supported use cases are homes, apartments, suitable business premises and small/medium event venues after private or corporate events.

Typical supported event contexts include parties/birthdays, weddings/receptions, family gatherings, corporate functions, funerals/memorials and similar events. Event type is workload/context data and does not itself set price.

## v1 standard scope

The normal service scope includes, where applicable to areas used by the event:

- collection and bagging of ordinary event rubbish;
- clearing bottles, cans, disposable food/drink items and loose debris;
- wiping accessible tables, chairs, furniture exteriors and surfaces;
- sweeping, vacuuming and mopping used areas;
- bathroom cleaning and sanitising;
- kitchen surface and sink cleaning;
- ordinary dining/living/entertainment-area cleaning; and
- general tidying/resetting of used spaces.

Ordinary event waste is bagged and placed in the customer/venue's designated refuse area. Off-site bulk-waste transport is not implied.

## Separately scoped workload

The following may add workload and/or require review rather than being assumed in the base scope:

- dishwashing/pots;
- patio, balcony, braai or larger outdoor entertainment areas;
- interior windows;
- carpet/upholstery specialist treatment;
- additional non-event rooms;
- unusually heavy waste; and
- significant spills or heavy ordinary soiling.

## v1 exclusions / review boundaries

The service does not automatically include:

- pre-event cleaning or event setup;
- cleaners stationed during the event;
- décor/event breakdown;
- bulk rubbish hauling;
- hazardous or biohazard cleanup;
- needles, dangerous chemicals or specialist contamination;
- specialist restoration, repairs or damage remediation;
- industrial-scale festivals, concerts or stadium-scale events; or
- unsupported specialist carpet/upholstery extraction.

Requests outside the supported boundary must not be guessed or silently priced. They route to review or are declined where unsafe/unsupported.

## Structured quote inputs

Post-Event Cleaning requires its own workload facts in addition to the normal customer, property/address, access and contact facts already used by HestivaOS.

Collect:

1. event type;
2. property/venue type;
3. approximate guest band: `1-20`, `21-50`, `51-100`, `101-150`, `150+`;
4. areas used by the event;
5. exact supported bathroom count where possible;
6. whether food/drinks were served and whether the kitchen was substantially used;
7. dishwashing requirement and approximate workload;
8. outdoor areas requiring cleaning, with subtype where known (patio, balcony, braai area, garden entertainment area, other);
9. waste level: light, moderate or heavy;
10. significant ordinary spills/heavy soiling;
11. event end date/time;
12. requested cleaning date/time; and
13. optional notes/photos through the existing approved Quote evidence path.

Guest count is a workload signal only. It is never a direct price band by itself.

## Waste definitions

- **Light:** limited bottles/cans/food packaging and roughly ordinary household-bin quantities.
- **Moderate:** noticeable event waste across several used areas, such as bottles, cans, disposable plates/cups and food waste.
- **Heavy:** substantial event waste or food/drink debris clearly beyond ordinary household quantities.

Heavy waste still means cleaning and bagging within supported scope. It does not automatically include off-site waste removal.

## Approved v1 floor-size base ladder

The following is the initial market-calibrated customer-facing base ladder and cleaner-hour model. It is subject to the universal HestivaOS profitability safeguard and final upward-to-next-R10 rounding.

| Floor area | Base cleaner-hours | Customer price from |
|---|---:|---:|
| Under 40 m² | 5.5 h | R850 |
| 40–59 m² | 6.5 h | R950 |
| 60–79 m² | 7.5 h | R1,100 |
| 80–99 m² | 8.5 h | R1,250 |
| 100–129 m² | 10 h | R1,450 |
| 130–169 m² | 12 h | R1,650 |
| 170–219 m² | 14 h | R1,900 |
| 220–299 m² | 16.5 h | R2,200 |
| 300+ m² | Review | Assessment |

Published `from` values must remain genuinely attainable for qualifying jobs and cannot override the profitability floor.

## Approved event workload adjustments

Apply event-specific cleaner-hours on top of the floor-size base:

| Workload input | Additional cleaner-hours |
|---|---:|
| 1–20 guests | +0 |
| 21–50 guests | +2 |
| 51–100 guests | +4 |
| 101–150 guests | +7 |
| 150+ guests | Review |
| Each bathroom beyond first | +1.5 |
| Kitchen substantially used for food service | +2 |
| Moderate dishwashing | +2 |
| Heavy dishwashing | +4 / review where uncertain |
| Patio/balcony | +1.5 |
| Braai area | +1.5 |
| Larger garden/outdoor entertainment area | +2.5 |
| Moderate waste | +1.5 |
| Heavy waste | +3 |
| Significant ordinary spills/heavy soiling | +2 |
| Specialist/hazardous contamination | Review/decline |

Avoid double-counting the same physical workload. For example, selecting an outdoor area should reveal the actual outdoor subtype instead of adding both a generic outdoor flag and the same subtype adjustment.

## Customer-facing workload price adjustment

For v1, each approved cleaner-hour above the floor-size base adds **R100** to the preliminary customer-facing service price.

Preliminary service price:

`floor-size base price + (additional approved cleaner-hours × R100)`

This is not the profitability model. HestivaOS must still calculate the internal six-bucket cost model and apply the universal minimum-contribution safeguard. The final permitted quote is the applicable service price protected by the profitability floor and then rounded upward to the next R10 under the existing canonical rules.

## Automatic-quote ceiling and review rules

Automatic Post-Event pricing is permitted only when the supported deterministic workload resolves to **24 cleaner-hours or less**.

Route to `NEEDS_ATTENTION` / deliberate review when any of the following applies:

- calculated cleaner-hours exceed 24;
- floor size is 300+ m²;
- guest band is 150+;
- a large/complex commercial or event venue falls outside the supported ordinary model;
- bulk/off-site waste removal is requested;
- dishwashing or other workload cannot be bounded safely;
- large specialist carpet/upholstery contamination is requested;
- hazardous/biohazard/specialist contamination is present;
- late-night/overnight cleaning requires staffing/commercial review; or
- any material scope fact is unsupported or ambiguous.

`NEEDS_ATTENTION` is not permission to guess a price. Existing Quote review/remediation rules remain authoritative.

## Same-night / overnight boundary

Customers may state the event end time and requested cleaning time. Normal daytime and next-morning work can use the deterministic model when all other facts are supported.

No automatic overnight surcharge is approved in v1. Late-night/overnight requests route to review until real staffing and operating evidence supports a separate approved rule.

## Cost-model integration

Post-Event Cleaning must reuse the existing HestivaOS operational-cost architecture rather than introducing a second pricing engine. Once deterministic cleaner-hours resolve, existing cost buckets continue to apply, including:

- cleaner labour, UIF and configured COIDA;
- route/deployment cost;
- consumables;
- equipment/vehicle reserve;
- overhead allocation; and
- minimum contribution/profitability protection.

Internal cost/margin detail remains hidden from the customer and operational supervisors under existing rules.

## Pilot and calibration

The initial coefficients are approved launch assumptions calibrated against the existing Hestiva service/workload model and Johannesburg/Gauteng competitor pricing research. They are not treated as immutable facts.

After approximately the first **10–20 completed Post-Event jobs**, compare estimated cleaner-hours against actual cleaner-hours and review common waste, dishwashing, outdoor-area and guest-volume effects. Adjust workload coefficients only through a deliberate approved change; do not silently change customer pricing from anecdotal individual jobs.

## Cross-system implementation sequence

1. HestivaOS canonical service/Quote/workload implementation.
2. Work Order/checklist and operational-scope integration.
3. Messaging Quote-flow integration using the shared authoritative Quote boundary.
4. Website catalogue/service page and conditional Quote fields.
5. Production smoke tests and early-job calibration.

The Website must not become pricing authority. Messaging must not create a second Quote/pricing authority. Both channels present/collect structured facts for the canonical HestivaOS Quote domain.