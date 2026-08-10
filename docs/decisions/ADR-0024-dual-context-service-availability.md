# ADR-0024: Allow one Service capability in both booking contexts

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

The current website quote source presents Interior Window Cleaning and Laundry Folding as both primary choices and add-ons. The existing `ServiceType` exclusivity could represent either context but not both. Creating suffixed duplicate Services would split one capability across IDs and make quote mapping and administration ambiguous. The current source contains no service-scope choices.

## Decision

Extend `ServiceType` with `BOTH`. A `PRIMARY` or `BOTH` Service may be assigned to `WorkOrder.serviceId`; an `ADD_ON` or `BOTH` Service may be assigned through `WorkOrderAddOn`. Catalogue queries for either booking context include `BOTH`, while ADMIN manages one availability value on the existing Service record. Existing Interior Window Cleaning and Laundry Folding IDs are retained and changed to `BOTH` by the undeployed Slice 5K migration.

Do not introduce Service Scope. Do not duplicate one capability solely to represent its booking context. Unresolved quantity, pricing, or semantic mappings fail closed until an approved decision exists.

## Consequences

The Work Order relationship architecture and add-on grid remain unchanged. The enum migration is additive, but application rollback after database deployment must tolerate the retained enum value at the database level. Future availability requirements beyond these three states trigger review of this ADR rather than uncontrolled booleans or duplicate records.

## Alternatives rejected

- Duplicate primary/add-on Service records would create competing canonical IDs.
- Independent booleans allow an invalid neither-selectable state without a demonstrated need.
- Keeping the exclusive enum would knowingly contradict current website capability availability.
