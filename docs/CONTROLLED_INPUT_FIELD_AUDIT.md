# Controlled input field audit

Verified 2026-08-10 against the editable React forms and Prisma/API contracts on this branch. This matrix records Slice 5B Phase 1 and the implemented Slice 5C/5E Customer and Property decisions. Province remains stored and API-compatible but is dormant rather than editable, so the current ordinary UI exposes **107 editable fields**: 50 free text, 11 fixed enum, 2 managed lookup, 13 relationship, 20 boolean, 7 date/date-time, and 4 numeric/currency. Four additional derived relationship summaries were reviewed as read-only.

| Module | Page/component | Field name(s) | Current control | Data type / backend model | Classification | Recommended control | Change | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Authentication | `/login` | Email; password | email/password | Supabase Auth strings | FREE TEXT (2) | Validated native inputs | No | Credentials are unique; Auth architecture is protected. |
| My Profile | `profile-manager` | First name; last name; display name; phone; profile photo; new/confirmed password | text/tel/file/password | `User` / Supabase Auth | FREE TEXT (7) | Existing native inputs | No | Personal and credential values are unique. |
| My Profile | `profile-manager` | Email | read-only email | verified Auth identity | READ-ONLY | Existing read-only control | No | Email changes require a separate verified flow. |
| User Access | `user-access-manager` | Search | search | query only | FREE TEXT (1) | Search input | No | Search is not persisted classification data. |
| User Access | `user-access-manager` | Role; role filter | selects | `UserRole` | FIXED ENUM (2) | Existing selects | No | Prisma enum is canonical. |
| User Access | `user-access-manager` | OS access; status filter | action/select | `UserStatus` | FIXED ENUM / BOOLEAN (2) | Existing confirmed action/select | No | Existing access semantics are preserved. |
| Business Profile | `business-profile-manager` | Registered/trading name, registration/contact/email/website/address, bank/account details, branch/payment instructions, tax/VAT/other identifiers | text/email/url/textarea | `BusinessProfile` strings | FREE TEXT (16) | Existing native inputs | No | Values are business-specific. Account type remains text pending evidence for an approved list. |
| Business Profile | `business-profile-manager` | Include-when-sharing for each detail | checkbox | 16 `share*` booleans | BOOLEAN (16) | Existing checkboxes | No | Correct semantic boolean control. |
| Employees | `employees-manager` | Reference, names, phones, email, address, emergency name/relationship, notes | text/tel/email/textarea | `EmployeeRecord` strings | FREE TEXT (11) | Existing native inputs | No | Unique record values; emergency relationship stays free text because a managed list adds unjustified scope. |
| Employees | `employees-manager` | Employment status | select | `EmployeeStatus` | FIXED ENUM (1) | Existing enum select | No | API validates the Prisma enum. |
| Employees | `employees-manager` | Job title; department | text before Phase 1 | legacy strings plus `BusinessListOption` IDs | MANAGED LOOKUP (2) | Active-option selects | **Yes—done** | Reusable business classifications must be ADMIN-managed. |
| Employees | `employees-manager` | Start date; end date | date | `EmployeeRecord` date | DATE (2) | Existing date inputs | No | API validates dates and ordering. |
| Employees | employee detail | User; technician; crew | read-only summary | canonical relations | READ-ONLY (3) | Existing summary/management links | No | Assignment ownership remains in existing modules. |
| Customers | `customers-manager` | Contact name, email, phone, notes, search | text/email/textarea/search | `Customer` strings/query | FREE TEXT (5) | Existing native inputs | No | Contact name is required and primary; legacy Name is API/database compatibility and display fallback data, not an ordinary input. |
| Customers | `customers-manager` | Status | select | `CustomerStatus` | FIXED ENUM (1) | Native enum select plus API enum validation | **Yes—backend validation added in Phase 2** | The Prisma enum is canonical; invalid runtime payloads are rejected. |
| Properties | `properties-manager` | Customer | canonical-ID select populated from the full Customer response | `Property.customerId` | RELATIONSHIP (1) | Search input plus native canonical-ID select using a lean label endpoint | **Yes—done in Phase 2** | Stores and validates the Customer ID, displays name/contact name rather than UUID, and does not retrieve notes or contact details. |
| Properties | `properties-manager` | Property type | not modeled | nullable `Property.propertyTypeOptionId` plus `BusinessListOption(PROPERTY_TYPE)` | MANAGED LOOKUP (1) | Active-option select | **Yes—done in Phase 2; website catalogue bootstrapped in Slice 5G** | Reusable operational classification is ADMIN-managed; five approved website values are bootstrapped, and inactive assigned values remain readable. |
| Properties | `properties-manager` | Name, address lines, city, postal code, access notes | text/textarea | `Property` strings | FREE TEXT (6) | Existing inputs | **Province made dormant in Slice 5E** | Unique location data remains free text; Province remains nullable in Prisma and accepted by the API but ordinary create/edit forms omit it and preserve existing values. Property Type is modeled separately as the managed lookup above. |
| Admin Services | `/admin/settings/services` | Name; description | text/textarea | canonical `Service` fields | FREE TEXT (2) | ADMIN-only catalogue management | No | Names receive safe trim/case normalization and the approved Eco alias; descriptions remain unique operational prose. |
| Admin Services | `/admin/settings/services` | Type | select | `ServiceType` | FIXED ENUM (1) | PRIMARY / ADD_ON | No | Minimal classification prevents service/add-on ambiguity. |
| Admin Services | `/admin/settings/services` | Lifecycle | action | `ServiceStatus` | FIXED ENUM (1) | Deactivate/reactivate | No | No permanent-delete UI; inactive history remains readable. |
| Operational Services | `/services` | Search and catalogue | search/read-only | canonical Service IDs/names | RELATIONSHIP SOURCE | Active catalogue | No | Ordinary users cannot create or type catalogue records here. |
| Cleaning templates | `cleaning-job-templates-manager` | Name; description | text/textarea | template strings | FREE TEXT (2) | Existing inputs | No | Unique template content. |
| Cleaning templates | `cleaning-job-templates-manager` | Duration | number | minutes integer | NUMERIC (1) | Existing number input | No | Correct numeric control. |
| Cleaning templates | `cleaning-job-templates-manager` | Status | select | enum | FIXED ENUM (1) | Existing select | No | Already controlled. |
| Cleaning templates | `cleaning-job-templates-manager` | Services | checkbox list | service IDs | RELATIONSHIP (1) | Existing labelled checkboxes | No | Canonical services are selected. |

The supplied website `JOB_TYPES` were reviewed but not imported. They mix cadence, scope, property shape, add-on wording, and `Other`; the existing Cleaning Job Template relationship is the candidate controlled operational home, pending an approved mapping. Quote-only `Multiple Services Required` and `Other (Please Describe)` are not Services. The `Cleaning Add-On Services` page is a grouping, not an operational record.
| Technicians | `technicians-manager` | Names, email, phone, skills, notes, search | text/email/textarea/search | `Technician` strings/array | FREE TEXT (7) | Existing inputs; skills follow-up | No | Personal fields stay free; skills need evidence before classification redesign. |
| Technicians | `technicians-manager` | Status | select | `TechnicianStatus` | FIXED ENUM (1) | Existing select | No | Already controlled. |
| Crews | `crews-manager` | Name; description; search | text/textarea/search | `Crew` strings/query | FREE TEXT (3) | Existing inputs | No | Unique crew data. |
| Crews | `crews-manager` | Status | select | `CrewStatus` | FIXED ENUM (1) | Existing select | No | Already controlled. |
| Crews | `crews-manager` | Leader; members | select/checkboxes | technician IDs | RELATIONSHIP (2) | Existing labelled canonical-ID controls | No | Stores technician IDs. |
| Shifts | `shifts-manager` | Title; location; notes | text/textarea | `Shift` strings | FREE TEXT (3) | Existing inputs | No | Unique shift context. |
| Shifts | `shifts-manager` | Start; end; date filters | datetime-local/date | `Shift` timestamps/query | DATE (4) | Existing date/time inputs | No | Existing scheduling semantics retained. |
| Shifts | `shifts-manager` | Break minutes | number | integer | NUMERIC (1) | Existing number input | No | Correct numeric control. |
| Shifts | `shifts-manager` | Crew; work order | select | canonical IDs | RELATIONSHIP (2) | Existing selectors; searchable later | No | Stores IDs. |
| Shifts | `shifts-manager` | Status | select | `ShiftStatus` | FIXED ENUM (1) | Existing select | No | Already controlled. |
| Work Orders | manager/detail | Customer; property; Service; crew; technician assignment | select/actions | canonical IDs | RELATIONSHIP (5) | Existing selectors, customer-filtered property, active Service for new work | No | Historical Service is nullable/readable; new records store the canonical Service ID. |
| Work Orders | manager/detail | Description; checklist description; status note | text/textarea | work-order strings | FREE TEXT (3) | Existing inputs | No | Manual Work Order Title is removed; legacy title remains a read fallback and new rows populate it automatically with the server reference. |
| Work Orders | manager/detail | Status; priority; checklist status | selects/actions | Prisma enums | FIXED ENUM (3) | Existing enum controls | No | Already controlled and API-validated. |
| Work Orders | manager | Scheduled at | datetime-local | timestamp | DATE (1) | Existing date-time control | No | Existing timezone behavior retained. |
| Work Orders | checklist | Sort order | implicit/number | integer | NUMERIC (1) | Existing ordering control | No | Numeric ordering. |
| Work Orders | photos | Photo/category | file/fixed action | URL and `WorkOrderPhotoCategory` | RELATIONSHIP / FIXED ENUM (2) | Existing file/category flow | No | Photo belongs to canonical work order. |
| Sign-off | `customer-sign-off` | Customer name; note; signature | text/textarea/signature | sign-off strings/data | FREE TEXT (3) | Existing inputs | No | Record-specific evidence. |
| Sign-off | `customer-sign-off` | Acceptance | checkbox | confirmation boolean | BOOLEAN (1) | Existing checkbox | No | Explicit boolean consent. |

## Phasing conclusion

The audit found that migrating every remaining candidate would combine unrelated domain decisions. Phase 1 therefore establishes the standard and converts Employee job title and department only. Customer/property Phase 2 is complete with the decisions above; Work Order/scheduling searchability is Phase 3; technician skills and any remaining evidence-backed classifications are Phase 4. Existing fixed enums, relationships, booleans, dates, and deliberately free-text fields remain unchanged.

## 2026-08-10 Property Type website alignment addendum

The authoritative initial Property Type vocabulary was separately verified in `HestivaHQ/hestiva/src/routes/quote.tsx`: Apartment, Townhouse, House, Duplex, and Other. Hestiva OS now bootstraps these into the managed `PROPERTY_TYPE` Business List without hard-coding the Property selector. “Not classified” is not canonical and is not seeded; null continues to mean unselected/unclassified. Existing custom values, inactive lifecycle decisions, IDs, and historical Property assignments are preserved. New assignment uses active options only and canonical management is `/admin/settings/business-lists`.

The same website source defines Bedroom values Studio, 1, 2, 3, 4, and 5+. They are recorded as a deferred controlled-input candidate and are not implemented in Slice 5G.

## Slice 5I accepted-quote Work Order controls (verified 2026-08-10)

| Area | Surface | Field | Control | Persistence | Classification | Historical behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Work Orders | create/edit | Primary Service | filtered select | nullable `service_id` FK | RELATIONSHIP | New jobs require active PRIMARY; inactive/null historical links remain readable. |
| Work Orders | create/edit | Add-ons | checkbox list | `WorkOrderAddOn` join | RELATIONSHIP (zero/many) | Newly attached rows require active ADD_ON; existing inactive rows remain readable. |
| Work Orders | create/edit/list/detail | Frequency | fixed select | nullable `WorkOrderFrequency` | FIXED ENUM | Null history displays as not recorded; custom description is accepted only for CUSTOM. |
| Work Orders | create/edit/list/detail | Home Condition | fixed select | nullable `HomeCondition` | FIXED ENUM | Null history remains readable without inferred condition. |
| Work Orders | create/edit | Property snapshot/access | read-only summary | canonical Property fields | RELATIONSHIP DISPLAY | No property/home values are copied into Work Order. |

## Slice 5J Property operational controls (verified 2026-08-10)

Implemented on Property: Bedrooms (`STUDIO`, `ONE`, `TWO`, `THREE`, `FOUR`, `FIVE_PLUS`), Bathrooms (`ONE` through `FOUR`, `FIVE_PLUS`), Living Areas (`ONE`, `TWO`, `THREE`, `FOUR_PLUS`), and Storeys (`ONE`, `TWO`, `THREE_PLUS`). The API validates every controlled value; blank selections persist as null. Existing managed `PROPERTY_TYPE` remains the sole type architecture and Province remains dormant.

The persistent profile also implements nullable estate/complex, gate/security access, pets, and camera indicators plus concise access, parking, pet, off-limits, fragile-care, product-restriction, and operational allergy notes. Approximate floor size is deferred because this repository contains no verified approved size-range vocabulary. Outdoor-area status is deferred because the verified records do not establish it as a persistent fact distinct from the Balcony Sweeping add-on. Controlled entry/key arrangement and occupant-presence defaults are deferred for lack of approved persistent vocabulary; general access notes remain canonical.

Visit condition, primary Service, Add-ons, frequency snapshot, schedule, assignment, and job instructions remain Work Order-specific. Service-scope reconciliation remains Slice 5K; ongoing agreement logic remains Slice 5L; accepted-quote transport and snapshot semantics remain Slice 5M.

## Slice 5K addendum — Service booking availability

| Module | Field | Control | Backend ownership | Decision |
| --- | --- | --- | --- | --- |
| Admin Services | Availability | `PRIMARY` / `ADD_ON` / `BOTH` select | `Service.type` | ADMIN controls where one canonical capability is selectable; normalized duplicate protection remains. |
| Work Orders | Primary Service | canonical-ID select | `WorkOrder.serviceId` | Active `PRIMARY` and `BOTH` capabilities only. |
| Work Orders | Add-ons | existing checkbox grid | `WorkOrderAddOn` | Active `ADD_ON` and `BOTH` capabilities only; no UI redesign or quantity fabrication. |

The current website supplies no Service Scope field, so no scope control or free-text scope exists. Unresolved website inputs remain fail-closed as documented in `QUOTE_TO_OS_VALUE_MAPPING.md`.
