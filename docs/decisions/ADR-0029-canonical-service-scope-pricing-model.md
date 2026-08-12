# ADR-0029: Canonical service scope, pricing and commercial-policy model

- **Status:** Accepted for migration
- **Date:** 2026-08-12

## Context

The earlier service-catalogue and dual-context decisions were made before Hestiva's full pricing, scope, workload, payment, cancellation, supervisor-assessment, laundry and customer-policy model had been designed. Subsequent product decisions established that several website options are not real operational Services, that Laundry must be add-on only, that Apartment and Eco-Friendly are contextual attributes rather than Services, and that pricing/scope must be represented deterministically enough to drive quotes, Work Orders, checklists and customer policy.

The approved product decisions are consolidated in `docs/CANONICAL_SERVICE_SCOPE_PRICING_V1.md`.

## Decision

Adopt `docs/CANONICAL_SERVICE_SCOPE_PRICING_V1.md` as the canonical business/product specification for service scope, pricing and related commercial policy during the coordinated website + HestivaOS migration.

### Catalogue semantics

- `Apartment` is a property type/context, not a Service.
- `Eco-Friendly` is a preference on compatible services, not a Service.
- `Add-On Services` is a UI grouping, not a Service.
- `Multiple Services Required` is a UX path that resolves to real selected services/add-ons, not a Service.
- `Other / Something else` is a manual-review escape hatch, not a canonical Service and is never automatically priced.
- `Laundry` and `Ironing` are add-on only to qualifying whole-home cleaning bookings.
- `Post-Renovation Cleaning` remains a PRIMARY SERVICE and is assessment/quote-required for v1.

### Supersession of ADR-0018

ADR-0018 remains historically accurate for the state and information available on 2026-08-10, but the following product-intent assumptions are superseded:

- Laundry Folding as the prior simple catalogue representation.
- Eco-Friendly/Eco-Conscious as a standalone operational cleaning service identity.
- The absence of a canonical pricing/scope model.

The underlying principles that HestivaOS owns the canonical operational catalogue, historical IDs/relationships are preserved, ambiguous mappings fail closed and permanent deletion is not casually exposed remain compatible and are retained.

### Supersession of ADR-0024

ADR-0024 remains historically accurate for the website state that presented Laundry Folding in dual contexts. Its `BOTH` decision is superseded **for Laundry**. Laundry must not remain selectable/persistable as a primary booking after this migration.

The generic architectural idea that one capability can be available in more than one booking context may remain valid for other capabilities where explicitly approved, including Interior Window Cleaning if its current business rules require that representation. Do not infer Laundry semantics from the enum alone.

### Pricing and policy authority

The canonical specification governs:

- floor-size pricing ladders;
- room/add-on pricing;
- Deep/Move-In/Move-Out staffing rules;
- workload modifiers;
- universal break-even protection;
- recurring discounts;
- customer-facing upward-to-next-R10 rounding;
- payment/deposit/completion rules;
- cancellation/no-access rules;
- service-quality guarantee;
- damage/incident workflow;
- valuables/prohibited handling;
- FAQ/checklist derivation.

## Consequences

The migration is cross-repository and cannot be treated as a text-only website change. Website values, HestivaOS catalogue semantics, quote contract, Work Order/add-on representation, validation, pricing logic, operational views and permanent documentation must remain aligned.

Historical data must not be destructively rewritten merely to fit the new model. Where a historical Service identity becomes non-selectable, preserve it for historical relationships and migrate new-booking behaviour deliberately.

Customer-facing FAQ, cleaner checklist and supervisor checklist material must be derived from the canonical specification so scope is not independently reinvented.

## Implementation constraints

- Unknown/unmapped values fail closed or route to Admin review.
- No partial accepted-quote import when required mapping is unresolved.
- Supervisor operational assessment remains price-blind where defined.
- Admin/customer approval is required for approved material on-site price/scope increases.
- Final payment-gateway selection, insurance provider selection and legal wording remain implementation/pre-launch tasks and do not reopen the completed pricing-discovery workflow.

## Review triggers

Review this ADR if Hestiva adds materially new service classes, changes the customer payment model, introduces specialist textile/exterior restoration services, changes the canonical break-even/rounding model, or replaces the service/add-on relationship architecture.
