# Issue #79 closure audit — Laundry & Ironing operating model

**Audit date:** 2026-08-14
**Scope:** `HestivaHQ/HestivaOS` Issue #79 and the coordinated `HestivaHQ/hestiva` website implementation.

## Result

The software acceptance criteria for Issue #79 are implemented across the website and HestivaOS. The remaining authoritative-COIDA-rate replacement is a broader operational costing-input follow-up and does not represent missing Laundry/Ironing eligibility, pricing, transport, persistence, capacity-control, or customer-facing behavior.

The dated Slice 5M-A / Slice 5M-B passages in `ARCHITECTURE.md` are preserved as historical implementation checkpoints. Current runtime state for this scope is defined by this audit, `WEBSITE_QUOTE_CONTRACT_V2.md`, `SLICE_5M_WEBSITE_QUOTE_INGESTION_BOUNDARY.md`, ADR-0029, ADR-0030, ADR-0031, ADR-0032, and the current roadmap.

## Acceptance matrix

| Issue #79 requirement | Verified current implementation |
| --- | --- |
| Laundry/Ironing cannot be standalone or primary bookings | Website primary-service options do not include Laundry Folding. HestivaOS preserves historical Laundry Folding as inactive and uses active canonical `Laundry` and `Ironing` `ADD_ON` Services for new operations. |
| Laundry/Ironing attach only to an eligible whole-home cleaning | `laundry-operating-model.ts` accepts only `Regular Home Cleaning` and `Deep Cleaning`; other primary services fail closed. |
| Washer + dryer → Wash, Dry & Fold | HestivaOS resolves `WASHER_DRYER` to `WASH_DRY_FOLD`. |
| Washer without dryer → Wash & Hang | HestivaOS resolves `WASHER_LINE` to `WASH_HANG`; website content explains use of the customer's suitable line/drying rack and does not promise same-visit folding for that outcome. |
| No washer → unavailable; no off-site Laundry | `NO_WASHER` is rejected for Laundry. Canonical website/OS policy is on-site equipment only. |
| Wash, Dry & Fold = R175/load | HestivaOS authoritative amount is 17,500 ZAR minor units per load. |
| Wash & Hang = R125/load | HestivaOS authoritative amount is 12,500 ZAR minor units per load. |
| Ironing = R150/load and remains separate | HestivaOS authoritative amount is 15,000 ZAR minor units per load. Ironing is a separate active `ADD_ON`; website wording does not silently include it with Laundry. |
| Iron/board and specialist-care boundaries | Website Laundry & Ironing customer content states the safe working iron/board requirement and keeps specialist garment-care scope outside the ordinary add-on. |
| Facilities/outcome/load quantities cross Website → OS structurally | Website Quote Contract v2 carries `request.laundry.facilities`, `laundryLoads`, and `ironingLoads`; Laundry/Ironing are rejected from generic display-label add-ons in v2. |
| Website handoff fails closed and receives authoritative acknowledgement | The guarded Website → HestivaOS endpoint validates v1/v2; the website v2 sender requires HestivaOS acknowledgement and authoritative `quoteReference` before reporting success. The production handoff was smoke-tested during website PR #139. |
| Accepted Work Orders persist quantities | `WorkOrderAddOn.quantity` is a positive integer with migration/database protection and structured API/UI input. |
| Recurring agreements persist quantities and generated visits retain them | `RecurringServiceAgreementAddOn.quantity` persists and generated Work Orders copy the saved quantity. |
| Labour/time feasibility safeguard | Laundry and Ironing require explicit `capacityApproved: true` before operational acceptance. No unapproved universal numeric load ceiling is fabricated. |
| Universal quote profitability safeguard remains in force | Website quote ingestion uses the HestivaOS-owned canonical pricing and six-bucket profitability calculation; Laundry pricing enters the same guarded quote boundary rather than bypassing it. |
| Historical IDs/data are preserved | Historical Laundry Folding is inactivated for new selection rather than deleted/remapped. Existing add-on rows migrate to quantity 1 and remain readable. |
| Tests cover valid/invalid combinations and pricing | API coverage exists for Laundry policy, Contract v2 and Website quote pricing; web regression coverage exists for Issue #79 add-on quantity persistence. Website PR #139 passed its exact-head 15-test regression suite and full website quality gate. |
| Customer-facing wording and OS semantics agree | Website compatibility page is presented as **Laundry & Ironing Add-On** with the same eligible services, facilities outcomes, separate Ironing rule and capacity wording. A final visual add-on tile terminology correction is handled in the coordinated website closure PR. |
| Admin/Supervisor operational semantics | Current Work Order and Recurring Service operational paths use the canonical persisted add-on quantity/capacity model. A dedicated Supervisor product experience is still a separate roadmap item; no parallel Supervisor Laundry policy or conflicting surface exists. Any future Supervisor UI must consume the same canonical API/domain rules. |

## Repository evidence

Key merged HestivaOS pull requests:

- PR #81 — authoritative Laundry add-on eligibility/pricing policy and safe catalogue migration.
- PR #82 — structured Website Quote Contract v2 for non-lossy Laundry/Ironing transport.
- PR #83 — Work Order / Recurring Agreement add-on quantity persistence and explicit capacity approval.
- PR #84 — guarded Website quote ingestion, authoritative pricing/profitability, replay handling, atomic Quote persistence and OpenRouteService routing.

Key website evidence:

- PR #139 — final structured Laundry/Ironing website transport, add-on-only customer presentation, production handoff smoke test and exact-head green website quality gate; merged 2026-08-14.

## Separate follow-ups that do not reopen Issue #79

- Replace the provisional `HESTIVA_COIDA_RATE` costing input when the business receives/confirms its authoritative Compensation Fund assessed rate.
- Complete remaining Slice 5M accepted-Quote orchestration and any non-Laundry exact-floor/photo-storage mapping still outstanding.
- Build the broader dedicated Supervisor experience when that separate product slice is approved.
- Continue normal service/content cleanup where legacy compatibility slugs or historical migration wording remain deliberately preserved.
