# Work Order Selector Search v1

Status: implemented on the Phase 1A branch pending merge.

## Purpose

Work Order creation and editing must remain usable as canonical Customer, Property, Technician, Crew and Service datasets grow beyond a small browser-loaded snapshot. This contract hardens selector discovery without introducing a new search service, changing canonical record ownership or weakening authorization.

## Canonical boundaries

- Customers, Properties, Technicians, Crews and Services remain the authoritative existing domains and IDs.
- Work Order creation and editing continue through the existing Work Order APIs; there is no quick/parallel Work Order type.
- The existing paginated domain APIs remain the search authority. No external index or duplicate selector database is introduced.
- Search is bounded to 20 returned records per request in the Work Order form and is debounced in the browser.
- Existing API page-size caps remain authoritative.
- Property search is scoped to the selected canonical Customer.
- Direct-create Customer/Property preselection remains ID-based and validates the Property belongs to the selected Customer.
- Customer and Property list search accept an exact canonical UUID so a direct-create deep link can resolve a record even when it is outside the first ordinary result page.
- Property selector-options also accept bounded name/address/city search while continuing to expose only identifying fields.

## UI behavior

The Work Order form provides server-backed search for:

- Customer;
- Property, after Customer selection;
- eligible Technician;
- active Crew;
- active primary Service;
- active add-on Service.

The form preserves the currently selected canonical record while a new search page is displayed. When editing historical Work Orders, the current Customer, Property, assigned Technicians, Crew and primary Service remain available even if they are inactive or are not present in the current active-search result page.

Selecting a Crew still reuses the existing Crew snapshot behavior: eligible active Crew members prepopulate the Work Order Technician assignment and the current Crew Leader remains the initial Job Leader where applicable. Search does not change assignment authority.

## Security and privacy

- No protected credential, private evidence path, provider identity, Finance data or unrelated Customer detail is added to selector payloads.
- Property selector-options remain a lean identifying projection and do not expose access notes, household/care notes, cameras, allergies or similar operational detail.
- Work Order Property profile detail continues to come from the already-authorized Property records used by the existing Work Order management surface.
- Backend authorization remains authoritative; search controls do not grant new mutation authority.

## Scope isolation

This slice does not change:

- Quote ingestion or accepted-Quote conversion;
- Work Order lifecycle/status rules;
- scheduling or dispatch policy;
- Technician/Crew assignment semantics;
- Service Scope or frozen Execution Scope;
- Finance or pricing;
- Customer Correspondence;
- Messaging/provider integration;
- Needs Attention or notification delivery.

## Verification expectations

Coverage must confirm:

- canonical ID lookup for Customer/Property preselection;
- lean Property selector projection and Customer scoping;
- server-backed bounded search controls for the Work Order reference fields;
- selected/historical record preservation while search results refresh;
- no return to fixed 100-record Customer/Property/Crew reference snapshots.
