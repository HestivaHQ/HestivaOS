# Technical work log

## 2026-08-14 — UI/UX speed pass 2F Business Lists auth-wrapper cleanup

- Audited Admin Settings → Business Lists after the page-wrapper authentication cleanup and confirmed it was the final routine page still obtaining its own Supabase session because it manually passed `session.access_token` into `api.businessLists(...)`.
- Added `businessLists(includeInactive)` to `createAuthenticatedApi()` so the server wrapper reuses the authenticated session/token it already owns.
- Updated the Business Lists page to resolve one authenticated API wrapper, synchronize the authoritative HestivaOS application User, preserve the existing exact ADMIN role check, load Business Lists through the wrapper, and use `appUser.email` for shell identity.
- Preserved Supabase identity ownership, protected-route middleware, API JWT verification, ACTIVE-status enforcement, ADMIN authorization, API contracts, Prisma schema, migrations, business behavior, deployment configuration, and fail-closed authentication.
- The implementation-only head passed the full PR quality gate before this mandatory history reconciliation. The final documented head must pass the same gates before merge.

## 2026-08-14 — UI/UX speed pass 2E final page-auth cleanup

- Audited the remaining server-rendered page wrappers after passes 2A–2D and separated presentation-only Supabase Auth reads from pages that still consume provider session data directly.
- Removed redundant page-level Supabase `auth.getUser()` calls from Technicians, Crews, Shift Planning, Work Order detail, Admin Settings, Employee Records, Admin Services, User Access, Business Profile, and Customer Data Cleanup. Each changed page now resolves the authoritative HestivaOS application User through the authenticated API and uses `appUser.email` for shell presentation.
- Preserved all existing HestivaOS authorization behavior, including ADMIN checks on administrative routes, protected-route middleware, authenticated API token acquisition, local API JWT verification, application-user synchronization and ACTIVE-status enforcement, and fail-closed behavior.
- Deliberately left Business Lists unchanged because it currently consumes the Supabase session access token directly for its `api.businessLists(...)` request; removing that session read requires a separate API-helper refactor rather than a presentation-only cleanup.
- No API contract, Prisma schema, migration, business workflow, deployment setting, dependency, or production configuration changed. The implementation-only head passed the full PR quality gate before this mandatory history reconciliation; the final documented head must pass the same gates before merge.

## 2026-08-14 — UI/UX speed pass 2D secondary-page auth cleanup

- Audited Profile, Services, and Cleaning Job Templates after the earlier navigation-auth passes. All three protected pages still performed page-level Supabase Auth reads before the shared HestivaOS application-user bootstrap; Profile additionally called both `auth.getUser()` and `auth.getSession()` before `syncUser()` even though the returned session token was only checked and not otherwise consumed by the page.
- Changed Profile to resolve the authoritative HestivaOS application User once through `createAuthenticatedApi().syncUser()`, use `appUser.email` for the shell and read-only authenticated-email presentation, and pass the same User into `AppFrame` so no second shell synchronization occurs.
- Applied the same single-user bootstrap to Services and Cleaning Job Templates. Both pages now resolve `syncUser()` once, use the application User email for presentation, and pass the User into `AppFrame` rather than calling Supabase `getUser()` and then causing the shell to perform a separate application-user synchronization.
- Preserved Supabase as identity authority, protected-route middleware, authenticated API token acquisition, local API JWT verification, HestivaOS User synchronization and ACTIVE-status enforcement, role authorization, and fail-closed behavior. No API contract, Prisma schema, migration, business workflow, deployment setting, dependency, or production configuration changed.
- The implementation-only head passed documentation validation, secret scanning, typecheck, full and independent builds, workspace tests, Cloudflare/OpenNext/Wrangler validation, whitespace checks, and clean/staged PostgreSQL migration replay before this mandatory history reconciliation. The final documented head must pass the same gates before merge.

## 2026-08-14 — UI/UX speed pass 2B dashboard query slimming

- Audited the live Admin dashboard against its API response and confirmed the current command-centre renders today's schedule plus the operational today/unassigned/overdue/upcoming summaries, while the legacy service still executed 21 transaction operations for historical totals, completion analytics, technician workload, recent activity, full status aggregation, and other data the current UI does not render.
- Added `OperationalDashboardService` and bound the existing `DashboardService` injection token to it in `DashboardModule`, leaving the public `/dashboard` controller and route unchanged. The original `DashboardService` remains temporarily as a non-live helper/reference path.
- Reduced the live database boundary from 21 transaction operations to three Work Order list queries: today's scheduled work, the next seven calendar days, and actionable overdue work. Today workload, today-unassigned count, upcoming day summaries, upcoming-unassigned count, and overdue-day values are derived in memory from those results.
- Preserved Africa/Johannesburg business-day boundaries, current workload status exclusions, crew-or-technician assignment semantics, authentication and authorization, Prisma schema and migrations, deployment topology, and the existing dashboard response shape. Legacy analytics fields remain as zero/empty compatibility placeholders without their former expensive queries; contract cleanup is deferred.
- The first PR run exposed one TypeScript inference mismatch in the in-memory actionable-status check. Replaced the inferred-array membership check with an explicit `Set<WorkOrderStatus>` boundary; the corrected exact head passed documentation validation, secret scanning, typecheck, full and independent builds, workspace tests, Cloudflare/OpenNext/Wrangler validation, whitespace checks, and clean/staged PostgreSQL migration replay.

## 2026-08-14 — UI/UX speed pass 2A

- Audited the remaining web-navigation hot paths after PR #85 and the local-JWT authentication pass. Protected middleware already verifies Supabase navigation, but several server-rendered pages still performed their own `supabase.auth.getUser()` before separately synchronizing or causing `AppFrame` to synchronize the HestivaOS application User.
- Removed that duplicate page-level Supabase user verification from Dashboard, Customers, Properties, Work Orders, and Recurring Services. Each changed route now resolves the authoritative HestivaOS application User once through the authenticated API and uses its email/ID for the same shell and page behavior.
- Removed the login client's immediate `router.refresh()` after `router.replace(nextPath)`, eliminating a redundant post-login render/request cycle while preserving the existing safe next-path handling, duplicate-submit guard, and Supabase sign-in/sign-up flow.
- Preserved protected-route middleware authentication, Supabase identity ownership, API JWT verification, application-user synchronization and ACTIVE-status enforcement, role authorization, and fail-closed behavior. No database, API contract, business workflow, deployment setting, dependency, or production configuration changed.
- Verified remaining performance debt rather than broadening this slice: lower-frequency protected pages still contain duplicate page-level Supabase user verification, and the dashboard overview API still computes substantial legacy totals, performance metrics, technician workload, recent activity, full status aggregates, and list data not rendered by the current daily command-centre UI. Dashboard query slimming is the next high-impact target.

## 2026-08-14 — Reliable GitHub connector operating procedure

- Replaced the earlier 3–5-decision routine checkpoint with a batching maximum of approximately 15 substantive approved decisions while retaining immediate synchronization for architecture, security, legal/compliance, infrastructure, payment and cross-system decisions where delay would create risk or inconsistency.
- Added a mandatory connector sequence of READ → VERIFY → WRITE → VERIFY → PR. Existing files must be fetched from the exact target branch immediately before replacement, current blob SHAs are used for writes, dependent mutations are serialized, and important writes are read back before later work depends on them.
- Added explicit failure handling: after a blocked, failed or timed-out mutation, re-read GitHub state before retrying; do not blindly repeat the same mutation or jump to low-level Git object/ref operations merely to bypass a normal connector block.
- Added branch/PR recovery rules: continue fixes on the same focused branch when scope is unchanged, inspect actual CI evidence, verify each new head SHA, and never merge a red or still-running required gate.
- Updated the documentation map to make the connector procedure discoverable. No application runtime, deployment, database, API, authentication, business policy or production configuration changed.

## 2026-08-11 — Slice 5M website Quote replay resolution

- Implemented `resolveWebsiteQuoteReplay` as a database-aware pre-creation classifier over the unique `Quote.submissionKey` identity. It returns explicit `NEW`, `REPLAY`, `CONFLICT`, or `CORRUPT_EXISTING` outcomes and creates no records itself.
- Reused the merged canonical SHA-256 website-payload fingerprint so object-key ordering is normalized while material nested changes and array-order changes remain significant.
- Manual review found a material correctness bug in the initial implementation: it compared retries with the mutable current Quote revision, which would falsely conflict after an Admin revision. The resolver now selects exactly one immutable `CUSTOMER_SUBMISSION` revision; missing or duplicate original submissions fail closed rather than guessing.
- Added focused Jest coverage for unseen submission IDs, identical retries, conflicting material, missing original revision, duplicate original revisions, and an identical original website retry after a later Admin revision.
- Preserved the concurrency boundary: a `NEW` classification is advisory only. Later atomic ingestion must rely on the existing database-unique `Quote.submissionKey`, re-read a concurrent winner, and apply the same replay/conflict rules before creating anything else.
- This sub-slice does not expose the private ingestion endpoint, calculate pricing, transfer photos, match/create Customers or Properties, create Work Orders or Recurring Service Agreements, or change deployment configuration.

## 2026-08-11 — Slice 5M runtime security and idempotency prerequisites

- Re-read the merged Slice 5M-B contract and Issue #73 security/idempotency decisions before implementation. This sub-slice adds only reusable runtime primitives and intentionally does not expose the private website ingestion controller, create/configure the integration secret, persist fingerprints, calculate pricing, transfer photos, or create any Quote/Customer/Property/Work Order/Recurring Service Agreement record.
- Added `apps/api/src/quotes/website-integration-auth.ts` with fail-closed `Authorization: Bearer ...` verification against `HESTIVA_WEBSITE_INTEGRATION_SECRET`. Missing/malformed authorization, missing configuration, and non-exact values are rejected. The implementation hashes both candidate and configured values to fixed-length SHA-256 digests before Node's `timingSafeEqual`, avoiding early length-based secret comparison while preserving exact equality semantics.
- Added `apps/api/src/quotes/website-quote-idempotency.ts` to produce a deterministic SHA-256 fingerprint of the complete structured submission. Canonicalization recursively sorts object keys and preserves array order; identical material with different object-key serialization yields the same fingerprint, while changed nested data or reordered arrays yields a different fingerprint.
- Added focused Jest coverage for exact and case-insensitive Bearer scheme parsing, missing/malformed credentials, missing configuration, prefix/suffix rejection, object-key-order stability, array-order preservation, nested material changes, and case-insensitive stored fingerprint comparison.
- Manual review found one documentation statement that still described the pre-hardening equal-length comparison. Corrected it before merge review so the runtime-support document now matches the SHA-256-digest implementation. The repository-mandatory changelog and technical work-log entries were added without altering earlier history; an accidental historical wording change detected in final diff review was restored before the final-head quality-gate run.

## 2026-08-11 — Slice 5M-B website Quote submission/pricing contract

- Re-read the locked Issue #73 payload, transport/authentication, pricing, photo retry/deduplication, and ownership decisions before implementation rather than deriving a new contract from the current website email text. The v1 contract is `schemaVersion: "1.0"`, stable website UUID `submissionId`, constant `HESTIVA_WEBSITE` source, canonical UTC submission time, and first-class customer/property/service/visit/access/household/safety/note/photo structures.
- Added `apps/api/src/quotes/website-quote-contract.ts` as a contract/validation module only. It records the planned private server-to-server route, E.164 customer mobile boundary, exact Apartment/Townhouse floor 0–50, no bathroom `OTHER`, explicit pseudo-Service review states, structured add-on quantity, customer-photo UUID/hash metadata, and the authoritative ZAR integer-minor-unit pricing response shape.
- Preserved only service/frequency restrictions verified from current `HestivaHQ/hestiva/src/components/LiveFormSubmission.tsx`: Move-In/Move-Out one-time; Regular Home/Apartment/Eco-Conscious all five frequencies; Deep one-time/monthly/custom; Kitchen/Bathroom/Bedroom/Living Area/Interior Window/Laundry Folding one-time/custom. No frequency restriction was fabricated for the newly approved Post-Renovation Cleaning because the current website source does not yet establish one.
- Corrected an initial in-branch draft before PR creation after comparing it line-by-line with the locked Issue #73 contract. The draft had used different field/version names and treated Extra Bathroom as quantity-capable; those unapproved assumptions were removed. V1 now permits explicit quantity only for Extra Refrigerator and Balcony / Patio Cleaning, with other selected add-ons fixed to quantity 1.
- Added focused Jest coverage for the locked envelope, verified frequency rules, CUSTOM detail, quantity boundary, E.164 matching input, exact-floor/access requirements, explicit pseudo-choice handling, and photo ID/hash conflicts. The tests validate the contract helper; they do not claim a runtime ingestion endpoint, pricing calculator, object-storage service, or persistence adapter exists yet.
- Added `WEBSITE_QUOTE_CONTRACT_V1.md` and ADR-0028, and updated the earlier Slice 5K mapping with a dated supersession section while preserving its historical assessment. The mapping now clearly distinguishes resolved product semantics from still-unimplemented persistence/runtime adapters.
- Important current-state gap is explicit rather than hidden: merged 5M-A stores `Quote.submissionKey`, Quote pricing snapshot fields, and `QuotePhoto.transferKey`/status, but does not yet persist exact floor or photo SHA-256 and does not calculate external `adjustmentsMinor`/line response values. 5M-B therefore does not expose `POST /api/integrations/website/quotes`; the later runtime sub-slice must implement exact mapping, hash/storage reconciliation, pricing calculation, idempotent replay/conflict behavior, and atomic persistence before the website can use this boundary in production.
- No environment secret was created or committed. `HESTIVA_WEBSITE_INTEGRATION_SECRET` is an approved future runtime secret name and trust rule only in this contract slice; deployment configuration changes must occur with the runtime endpoint implementation and its required environment/deployment/recovery documentation.

## 2026-08-11 — Slice 5M-A authoritative Quote domain foundation

- Reconciled the accepted Slice 5M decisions in HestivaOS Issue #73 against current `main` before implementation. The existing schema had Customer, Property, Work Order, recurring agreements, Services, and Work Order daily references, but no durable Quote aggregate; the website reconciliation also confirmed its current quote reference is ephemeral and its payload is primarily presentation text.
- Added an additive Quote domain without changing existing Customer/Property/Work Order behavior: `Quote` owns stable commercial identity, status, validity, current revision number, and future operational linkage slots; `QuoteRevision` owns immutable structured submission/pricing snapshots; `QuoteLineItem` owns quantity/unit/line pricing; `QuotePhoto` owns customer/Admin provenance and transfer state; `QuoteActivity` owns append-only quote history; `QuoteDailyCounter` is the atomic primitive for the approved daily quote-reference family.
- Added database-unique retry identities at the durable boundary: every Quote has a required `submissionKey`, and every QuotePhoto has a required `transferKey`. Later ingestion/transfer services must reuse these keys across retries so duplicate requests cannot create duplicate Quote or photo records.
- Stored pricing in integer minor units with initial `ZAR` currency, explicit subtotal/discount/total, and dormant tax fields defaulting disabled/zero. This foundation does not implement pricing calculation, customer-facing VAT presentation, coupon codes, or QuickBooks.
- Preserved one stable public Quote reference across revisions. Revisions are uniquely numbered per Quote and keep the submitted structured JSON plus their own immutable financial line-item snapshot. Customer and Admin photos remain distinguishable; failed/pending/stored transfer states have durable metadata rather than relying on email attachments.
- Kept accepted-quote orchestration deliberately out of this sub-slice. Nullable Customer/Property/WorkOrder/RecurringAgreement identifiers are linkage slots only; no foreign-key coupling, automatic record creation, matching, Accept/Decline token flow, website endpoint, or operational mutation is introduced yet.
- Added migration `20260811210000_quote_domain_foundation`, focused `node:test` source-contract coverage, ADR-0027, and the ADR index entry. Full pull-request validation owns Prisma generation, clean/staged PostgreSQL replay, typecheck/build/test, OpenNext/Wrangler dry-run, secret scan, documentation check, and whitespace verification.

## 2026-08-10 — Slice 5E operational flow, controlled deletion, and role synchronization

- Traced Customer deletion through Prisma: `Property.customer` is configured with `onDelete: Cascade`, while `WorkOrder.customer` and `WorkOrder.property` restrict deletion. The prior direct `customer.delete` could therefore destroy linked Properties when no Work Order existed or surface a relational Prisma fault as HTTP 500 when history existed. Added an explicit relationship-count guard returning HTTP 409 for Work Order history first and linked Properties second; no schema, cascade, or data migration changed.
- Added frontend `ApiError` status retention and Customer denial presentation. Known 403/409 results show “Action denied” plus the API's safe domain reason; validation is distinct, and unexpected faults do not expose raw response/database text.
- Traced the incorrect shell role to routes that rendered `AppFrame` without `user`, combined with account components' literal `Technician` fallback. The Profile route happened to pass its synchronized User, which made visiting Profile appear to repair the shell. `AppFrame` now synchronizes independently when necessary, passes one authoritative AppUser to desktop/mobile views, and neutralizes the fallback. Existing roles, permissions, reconciliation, and Supabase ownership are unchanged.
- Added create-mode query continuation using returned persisted IDs: Customer → Property and Property → Work Order. Property and Work Order forms validate preselected IDs against loaded canonical records, and Work Order preselection enforces the Customer/Property relationship. Services remain user-controlled.
- Removed Province controls and Province form payloads while retaining the schema/API compatibility field and existing display behavior. Updated optional Property Type UX to active Business List options, a neutral null state, inactive historical readability, and an ADMIN configuration path when empty.
- Reordered the single shared navigation source and removed its Services entry; the route, API, catalogue, and Admin Settings → Services page remain intact. Added focused API and source-contract web coverage for deletion protection, authoritative roles, navigation ownership, deep links, Property Types, Province dormancy, and safe denial messages.

## 2026-08-10 — Slice 5D canonical service catalogue

- Audited `Service`, migrations, APIs, `/services`, Cleaning Job Templates, Work Orders, and authorization. Before this slice Service already had description, optional duration, and status, and related only to Cleaning Job Templates; Work Orders still have no Service foreign key. Repository records cannot prove production row contents, so the migration performs data-aware reconciliation rather than claiming particular pre-existing rows.
- Used the supplied verified website repository `HestivaHQ/hestiva`, specifically `src/content/services.ts` and `src/lib/quote-options.ts`. Reconciliation safely compares trimmed case-insensitive names and the single approved `Eco-Friendly Cleaning` alias. Unambiguous matches keep IDs; missing approved entries receive stable IDs; legacy OS-only and ambiguous rows remain untouched. Re-running deployment migrations cannot recreate entries.
- Established 11 `PRIMARY` entries. Classified the single Laundry Folding page record as `ADD_ON`, consistent with its supplied optional-service description, and added the six explicit visual add-ons: Inside Fridge Cleaning, Inside Oven Cleaning, Interior Cupboard Cleaning, Extra Laundry Folding, Balcony Sweeping, and Additional Room Cleaning. No fake durations, pricing, staffing, SEO content, images, or arbitrary marketing bullets were added.
- Excluded `Multiple Services Required`, `Other (Please Describe)`, and the `Cleaning Add-On Services` grouping page. Recorded `Eco-Conscious Cleaning` as canonical and the quote-form wording as an alias without a duplicate. Website synchronization is deferred.
- Restricted POST/PATCH catalogue management to ADMIN and removed permanent deletion from the contract and UI. Operational reads remain authenticated. Admin Settings now owns searchable create/edit/deactivate/reactivate controls; `/services` lists active records. Template assignment continues to reject inactive records while existing inactive relationships remain included and readable.
- Did not import website `JOB_TYPES`. Cleaning Job Templates already model reusable operational templates related to Services, but the supplied options include cadence, property scope, and free-form flow choices; mapping them automatically would be unsafe. A controlled mapping is deferred.

## 2026-08-10 — Slice 5C Customer and Property controlled inputs

- Audited the existing Customer and Property models, APIs, forms, validation, relationships, and ADR-0017 architecture. Customer status remains a fixed enum with new runtime validation; personal and record-specific strings remain free text. No unsupported Customer Type or contact-method field was invented.
- Added `PROPERTY_TYPE` to the existing Business Lists architecture without seed data, a nullable Property foreign key, active/type validation, inactive-assignment read compatibility, and ADMIN create/rename/deactivate/reactivate controls. The existing GET list is available to authenticated form consumers while mutations remain ADMIN-only.
- Replaced Property selector data loading with a lean searchable Customer label contract containing only ID, name, and contact name. Property updates now validate changes to the canonical Customer relationship. The migration performs no backfill, destructive normalization, or modification of historical records.
## 2026-08-10 — Slice 5B controlled inputs Phase 1

- Completed and recorded the system-wide form audit before implementation. The audit found broad existing use of enums, IDs, booleans, and native dates, and bounded implementation to Employee job-title/department managed lists.
- Added the additive Prisma migration, ADMIN-only business-list API and management controls, active typed-option validation, Employee controlled selects, legacy-label compatibility, focused tests, ADR-0017, and operational documentation. No seed categories or destructive normalization were introduced.

## 2026-08-10 — Employee Records CORS preflight correction

- Traced Employee Records browser calls through the shared web `apiFetch` helper to the Railway API. List, create, and update retain bearer authorization; JSON requests retain `Content-Type`; fetch retains its default CORS mode and credential behavior. The Employee Records client is therefore not using a divergent request implementation.
- Corrected the API allowlist parser, which previously split `CORS_ALLOWED_ORIGINS` without removing separator whitespace or URL trailing slashes. Because browser `Origin` values contain neither surrounding whitespace nor a trailing slash, such a configured entry could yield a 204 OPTIONS response without a matching `Access-Control-Allow-Origin`; the browser then withheld the actual request.
- Kept explicit origins and credential support, and made the existing GET/HEAD/PUT/PATCH/POST/DELETE methods plus the actually required `Authorization` and `Content-Type` headers explicit. Added focused API and web policy tests. No route, authorization rule, data model, Prisma artifact, dependency, Cloudflare architecture, Railway architecture, or platform setting changed.

## 2026-08-10 — Business Profile primary button label correction

- Corrected the Business Profile-specific CSS cascade so its filled primary Save and Copy controls retain white label text instead of inheriting the teal text intended for adjacent outlined controls.
- Kept the existing button elements, labels, responsive layout, save and clipboard handlers, submit/loading/disabled behavior, WhatsApp and email controls, data model, API, authorization, dependencies, and sharing logic unchanged.

## 2026-08-09 — Product Implementation Slice 4 — Business Profile

- Converted the Admin Settings signpost into the canonical `/admin/settings/business-profile` route. The page retains `AppFrame`, verifies exact ADMIN access during server rendering, presents General Business Information, Banking & Payment Information, and Compliance & Official Information, and provides explicit save progress, duplicate-submit prevention, success, and useful error states.
- Added one database-enforced singleton `BusinessProfile` row with typed nullable fields and typed per-field share booleans. General customer-facing fields default on; all banking and compliance fields default off. No production business values are seeded, and no secret/credential fields exist.
- Added `GET` and `PATCH /api/v1/admin/business-profile`, both protected by ADMIN role metadata and the global authentication/access guard. The patch service rejects unknown keys, validates optional email and HTTP(S) website values, trims boundary whitespace, returns no ID/timestamps, and logs only actor ID plus changed field names—not banking, tax, or other field values.
- Sharing is local-only: recipient-less `wa.me` opens WhatsApp with encoded text, `mailto:` opens the configured mail client, and copy uses Clipboard API with a legacy browser fallback. The pure formatter emits only selected non-empty approved fields and no model metadata. Completeness is the filled count across registered name, registration number, contact number, business email, and business address, divided by five and rounded to a percentage.
- Persistent audit storage is deferred because no suitable general audit model exists; application logs retain only mutation actor and field names. Future management view/share groups and reuse by quotations, invoices, emails, and generated documents remain deferred. Employee Records, dashboard, User Access, auth reconciliation, role enum, infrastructure, storage, and dependencies were not changed.

## 2026-08-09 — Product Implementation Slice 3 — User Access Management

- Converted the Admin Settings User Access signpost into `/admin/settings/user-access`, an ADMIN-only server-rendered entry with a responsive client manager. It lists application-user name, email, role, explicit OS access, and an honest unavailable activity value; it supports local name/email search and simple role/access filters. Role demotion and access disablement require confirmation, destructive controls are separated, and no HR or Employee Records fields are shown.
- Added `GET /users/admin`, `PATCH /users/:id/role`, and `PATCH /users/:id/access`. Both route metadata and the server-rendered page enforce exact ADMIN access. Inputs are checked against existing Prisma enums, profile editing remains unable to change roles, and Supabase Auth roles/UUIDs are not mutated.
- Reused `User.status` after repository inspection found no employment use; it now explicitly means OS access. `Technician.status` remains the separate workforce concept. Added a global API guard for every route except health/readiness: it validates Supabase, requires an active application User, and fails closed before controllers. The sync exception preserves new-user bootstrap and verified-email stale-UUID reconciliation. Disabled users are blocked at the next application request and web bootstrap signs them out.
- Did not add Supabase Admin/service-role handling. Provider sessions are not globally revoked and may remain valid at Supabase, but cannot authorize the Hestiva API. Account creation is deferred to a focused secure invitation design.
- Put active-ADMIN removal behind a serializable transaction and transaction-scoped PostgreSQL advisory lock, with the count and update in the same boundary. The service prevents the last active ADMIN from demotion/disablement, rejects self-demotion/self-disable, and maps serialization conflicts to controlled responses.
- Deferred permanent deletion because `User` has restricted operational customer, work-order, and activity relationships; no business history is cascade-deleted. Changes emit identifier-only application logs, while persistent admin audit history is deferred because no suitable general audit model exists. Business Profile remains Slice 4 and Employee Records remains Slice 5. No Prisma schema, migration, dependency, dashboard, scheduling, deployment, photo/storage, or auth-reconciliation implementation changed.

## 2026-08-09 — Auth identity reconciliation and login resilience

- Traced the authenticated home bootstrap from Supabase `getUser()` through the server API session and `POST /users/sync`. The prior `upsert` keyed only by `auth_user_id` entered its create branch for a replacement Auth UUID; the surviving normalized email then violated the unique `users.email` constraint, and the uncaught Prisma error propagated through the server-rendered home route as HTTP 500.
- Replaced that upsert with a serializable synchronization transaction. Existing UUID matches keep their application identity and accept a non-conflicting authoritative email change; one stale email match is rebound only with Supabase `email_confirmed_at`; absent matches retain default TECHNICIAN creation. Ambiguous, unverified, UUID/email-conflicting, and concurrent unique-constraint states fail closed with controlled errors and identifier-only logs.
- Preserved the existing application user primary key during reconciliation, so User-owned customers, work orders, and activity references remain attached. The separate `technicians` model has no User foreign key in the current schema and is neither modified nor deleted; its workforce, shift, crew, and work-order relationships remain untouched.
- Hardened login submission with an immediate in-flight ref guard in addition to the disabled button, mode-specific progress copy, non-sensitive errors, and `finally` restoration. The existing signup callback remains derived from `window.location.origin`; repository search found no active Maintenance Marshall authentication redirect.
- Added focused API unit coverage for UUID matches, verified stale-identity recovery with ID/relationship continuity, unverified denial, ambiguous matches, new-user bootstrap, and conflicting legitimate email changes. No schema, migration, dependency, dashboard, work-order, scheduling, customer, business-profile, employee-record, permission, Railway, or Cloudflare change was made. Product Slice 3 access-management functions remain deferred.

## 2026-08-09 — Product Implementation Slice 2 — Profile & Admin Settings Foundation

- Separated personal account management from administration. My Profile now edits only profile photo, first name, last name, optional display name, and optional phone number; the Supabase-authenticated email is read-only. Removed role, job title, and department from both the UI and self-profile API input while preserving their existing User columns and values. No Prisma schema or migration changed.
- Added a Security section using the installed Supabase client's `auth.updateUser({ password })` flow with confirmation, minimum-length validation, loading/disabled state, duplicate-submit prevention, and success/error feedback. Password values are neither sent to the Hestiva API nor logged or stored in its database.
- Replaced direct avatar/profile and standalone sign-out interactions in the shared desktop and mobile frame with one compact account menu using the existing AppUser identity. The native button exposes expanded/control state; navigation, Escape, and outside click close it. Only ADMIN sees Admin Settings.
- Added `/admin/settings` as a server-rendered ADMIN-only gateway. Its role check uses the synchronized authenticated User record and redirects every other current or future role to the dashboard. User Access and Business Profile are informational future-module cards only; their implementation remains Slice 3 and Slice 4, while Employee Records remains Slice 5. The existing role architecture is retained.

## 2026-08-09 — Slice 1A mobile AppFrame navigation correction

- Corrected the responsive presentation of the shared `AppFrame` without changing its approved desktop sidebar or dashboard content. At widths up to 900px, a compact Hestiva OS header now exposes the existing navigation-link source through an initially closed drawer, so page content begins immediately below the header.
- Preserved all nine navigation destinations, active-state styling, existing AppUser photo/initials identity, job-title-or-role display, `/profile` access, and sign out. The real menu button exposes `aria-expanded`, `aria-controls`, and an adaptive label; menu links, its close control, Escape, and the backdrop close the drawer using native React and CSS only.
- Changed no dashboard API or calculations, route, role, permission, authentication behavior, Prisma artifact, dependency, Supabase integration, deployment configuration, or desktop dashboard design.

## 2026-08-09 — Product Implementation Slice 1 — Admin Dashboard Foundation

- Replaced the analytics-heavy Admin home page with a responsive daily command centre ordered as header, four shortcuts, today's schedule, actionable alerts, today-only Current Workload, and Upcoming Work. The dashboard now uses the shared `AppFrame`, keeps its page server-rendered, and limits client state to an accessible reusable collapsible section control.
- Added an additive `operationalDashboard` API contract. Africa/Johannesburg day boundaries now govern dashboard today, tomorrow, seven-day, and overdue calculations without depending on server timezone. Today's scheduled query excludes cancelled work; assignment treats a job as unassigned only when both crew and technician are absent; the workload omits `CLOSED`, `CANCELLED`, and `WAITING_FOR_PARTS`; upcoming summaries group tomorrow through seven calendar days later and count unassigned work.
- Restricted dashboard alerts to real, self-resolving today's-unassigned and reliable late/overdue conditions. Worker Issue and Job Exception remain approved future categories because no functional models exist. Maintenance waiting-for-parts and high-priority informational alerts are no longer presented.
- Used existing `WorkOrder.title` as the job label because there is no direct Service relation, existing Property fields for address, crew-first assignment, and the canonical `/work-orders/[id]` detail route. The four shortcut targets are `/customers`, `/work-orders`, `/shifts`, and a non-destructive pending Management gateway; no unsupported query state was invented.
- Preserved the Prisma schema, migrations, dependencies, authentication, deployment configuration, legacy API compatibility fields, future roles, and existing shared navigation. Full Admin Settings, Business Profile, Employee Records, Supervisor UI, Management gateway, scheduling/navigation redesigns, alert models, Service modelling, and repository-wide legacy cleanup remain deferred.

## 2026-08-08 — OpenNext monorepo validation path

- Investigated the failed PR quality gate and confirmed that `apps/web/open-next.config.ts` already contains the supported OpenNext Cloudflare 1.20.2 minimal configuration, `defineCloudflareConfig()`. The root cause was execution from the repository root: OpenNext discovers its configuration relative to the current project directory, while Hestiva OS keeps the Next.js project, OpenNext config, Wrangler config, and `.open-next` output under `apps/web`.
- Set only the OpenNext build steps in the PR and manual migration validation workflows to `working-directory: apps/web`. This uses the existing configuration and produces `apps/web/.open-next/worker.js` and assets where the unchanged `apps/web/wrangler.jsonc` expects them. Wrangler remains a root-invoked dry run with the same Worker name, entry, assets binding, compatibility date, `nodejs_compat`, `keep_vars`, `API_URL`, and observability configuration. No credential or deployment was introduced.
- Locally confirmed that invoking OpenNext from `apps/web` discovers the existing config, recognizes the monorepo and web app directory, and completes an OpenNext bundle with `.open-next/worker.js`. The available install was still Next.js 15.5.21 under Node.js 20.20.2, so GitHub must perform the authoritative Next.js 16 build on Node.js 24. Local `cf-typegen` and Wrangler dry run stopped before execution because Wrangler 4.120.0 requires Node.js 22 or later; no deployment occurred.

## 2026-08-08 — Next.js 16 pull-request validation

- Temporarily extended `.github/workflows/pr-quality-gates.yml` so the existing pull-request-triggered Node.js 24 job runs Cloudflare type generation, the OpenNext build, and a Wrangler dry run immediately after its independent web build. Normal GitHub Actions fail-fast behavior applies to all three additions.
- Preserved every existing quality-gate check and added no dependency, application, configuration, credential, environment, architecture, or deployment change. Wrangler uses the checked-in configuration only with `--dry-run` and writes validation output to `/tmp/hestiva-next16-validation`; no production deployment is possible from the added step.

## 2026-08-08 — Next.js 16 manual validation workflow

- Added `.github/workflows/nextjs16-migration-validation.yml` as a temporary `workflow_dispatch`-only validation path on Node.js 24. It installs the committed lockfile, verifies root-postinstall Prisma Client generation, and runs the requested root, API, web, OpenNext, Cloudflare type-generation, repository documentation, secret, and whitespace checks in order; every required check uses normal fail-fast behavior.
- Constrained Cloudflare validation to `npx wrangler deploy --dry-run` with the checked-in Worker configuration and a temporary output directory. The workflow has read-only repository permission, contains no Cloudflare token or account ID, requires no production secret, changes no environment, and performs no deployment.
- Added a successful-run job summary covering each validation result and production deployment status. Authenticated runtime route testing is explicitly retained as a separate post-build smoke test because this workflow does not receive Supabase credentials. Creating the workflow does not declare the Next.js migration or dependency remediation complete; the separate authoritative dependency-security audit remains required.

## 2026-08-08 — Next.js 16 security migration

- Audited the frontend against Next.js 16 breaking changes before editing it. The application contains a Supabase authentication `middleware.ts`, awaited `cookies()`, awaited dynamic `[id]` params, a route handler using standard `URL.searchParams`, and client-side `useSearchParams`. It contains no `headers()` or `draftMode()` calls, synchronous request API access, `generateSitemaps`, `next lint`, Next-coupled ESLint configuration, custom webpack configuration or injecting plugin, runtime config, PPR/dynamicIO APIs, Next image component or custom loader, configured rewrites or redirects, or server actions.
- Pinned Next.js 16.3.0. Its resolved metadata selects PostCSS 8.5.23 and optional Sharp 0.35.3, replacing Next.js 15.5.21, PostCSS 8.4.31, and the Next-owned Sharp 0.34.5 path. Added no direct PostCSS/Sharp dependency, override, canary, or unrelated framework upgrade.
- Preserved the authentication middleware and its Supabase SSR cookie behavior; no source compatibility edits were required because the relevant async request APIs were already awaited. Recorded migration to the preferred `proxy` convention as separate follow-up.
- Selected default Turbopack behavior and added no `--webpack` flag. The application has no custom webpack behavior, and the locked OpenNext Cloudflare 1.20.2 peer metadata explicitly includes Next.js 16.3.0; Wrangler remains 4.120.0. Worker name, entry, assets, compatibility date and flag, `keep_vars`, `API_URL`, observability, and native Git authority remain unchanged.
- Attempted all requested validation without deploying. The environment runs Node.js 20.20.2 rather than the repository-required Node.js 24 and returned HTTP 403 while `npm ci` fetched PostCSS 8.5.23. The incomplete install prevented Prisma bootstrap, typecheck, builds, tests, OpenNext, type generation, Wrangler dry-run, and route regression testing. Both requested audits also returned HTTP 403, so no local vulnerability counts are recorded. GitHub validation and its authoritative security diagnostic remain required; remediation is not declared complete.

## 2026-08-08 — Dependency Security Remediation PR 2

- Updated the web workspace's existing compatible Wrangler range from `^4.113.0` to `^4.120.0`. Normal npm resolution selected Wrangler 4.120.0, Miniflare 5.20260801.1-alpha, Undici 7.29.0, Miniflare-owned Sharp 0.35.2, and Workerd 1.20260801.1; the Wrangler-owned `@speed-highlight/core` support dependency also moved from 1.2.17 to 1.2.23.
- Confirmed with the installed dependency tree that Sharp 0.35.2 belongs to Miniflare and the remaining Sharp 0.34.5 node belongs only to Next.js 15.5.21. Next.js, PostCSS, OpenNext 1.20.2, Prisma, Supabase packages and configuration, and Railway configuration were not changed. No npm override or direct Miniflare, Undici, Sharp, or Workerd dependency was introduced.
- Built the OpenNext bundle successfully and confirmed `.open-next/worker.js` was generated. Wrangler 4.120.0 accepted the unchanged `apps/web/wrangler.jsonc` in a dry run, including Worker name `hestivaos`, `.open-next/worker.js`, assets binding and directory, compatibility date and `nodejs_compat` flag, `keep_vars`, repository-owned `API_URL`, and observability. Only the environment's proxy-detection warning was emitted; there was no configuration deprecation or changed-semantics warning.
- Started the OpenNext/Wrangler local preview successfully. The local Worker returned HTTP 500 for an application request because protected Supabase build variables are deliberately unavailable in this environment; no values or platform variables were changed. No Cloudflare deployment, dashboard mutation, Railway operation, Supabase operation, or production environment change was performed.
- Both requested registry-backed npm audits returned HTTP 403, so this record makes no claim about verified post-change vulnerability counts. Overall remediation remains incomplete pending the authoritative GitHub Actions audit and separate Next.js, PostCSS, and Next-owned Sharp work.

## 2026-08-08 — Dependency Security Remediation PR 1

- Applied a normal npm lockfile resolution refresh, constrained to the authorized transitive patches: `brace-expansion` 1.1.16 → 1.1.18, 2.1.2 → 2.1.4, and 5.0.7 → 5.0.9; `fast-uri` 3.1.4 → 3.1.5; `js-yaml` 3.15.0 → 3.15.1 and 4.3.0 → 4.3.1; and `nanoid` 3.3.16 → 3.3.18. The resulting lockfile contains none of the vulnerable starting versions.
- Kept `package.json` unchanged, introduced no npm overrides, used neither `npm audit fix` nor `npm audit fix --force`, and made no direct dependency or major-version upgrade. The lockfile diff does not change Next.js, Wrangler, Miniflare, Sharp, Undici, or any unrelated dependency family.
- Registry-backed before and after vulnerability counts were not verifiable in this environment because the npm advisory API returned HTTP 403. This record therefore identifies the removed target versions without estimating counts or claiming that the overall dependency-security programme is complete.
- Wrangler and Cloudflare tooling remediation remains pending. Next.js, PostCSS, and Sharp compatibility investigation remains pending; the remaining Miniflare and Undici work also stays outside this PR.

## 2026-08-08 — Dependency security audit diagnostic

- Added a temporary, manually dispatched Node.js 24 workflow to install the committed dependency graph, verify Prisma Client generation through the root bootstrap, and collect full, production-only, JSON, and outdated-package npm diagnostics without stopping at expected vulnerability exit codes.
- Made each diagnostic exit status visible in the job log and step summary, and retained the JSON audit output as a 14-day workflow artifact when npm produces it.
- Limited the workflow to read-only repository access with no secrets, production credentials, dependency mutation, automatic trigger, or deployment capability. Dependency remediation remains outstanding pending review of the diagnostic results.

## 2026-08-08 — Cloudflare environment ownership hardening

- Enabled Wrangler variable preservation while retaining repository ownership of the `hestivaos` Worker configuration and its existing `API_URL` binding.
- Added deterministic production deployment validation for the four required Cloudflare build-variable names. Validation runs before OpenNext builds, reports missing names only, and leaves ordinary local build and development commands unchanged.
- Removed the deploy-capable GitHub Actions frontend workflow so Cloudflare native Git remains the sole automatic frontend deployment authority; the pull-request quality gate remains verification-only.
- Completed the frontend environment example with optional public Storage bucket names and synchronized architecture, deployment, environment, recovery, planning, and decision records.
- Preserved Railway and Supabase configuration, application business logic and authentication behavior, Prisma schema, and migrations.

## 2026-08-07 — Clean-install Prisma Client bootstrap

- Moved Prisma Client generation to the root npm `postinstall` lifecycle so both `npm ci` and `npm install` prepare `@prisma/client` types before workspace typecheck, build, or tests run on a clean checkout.
- Removed generation from the API build command so one dependency bootstrap does not regenerate the same client during root and independent API builds. The API build remains `nest build`; explicit generation remains available as root `npm run db:generate`.
- Renamed the PR workflow install step to expose its bootstrap responsibility while retaining the Node.js 24, non-deploying verification sequence.
- Preserved the Prisma schema, migrations, application behavior, authentication, Supabase integration, and deployment topology.

## 2026-08-07 — Phase 1 API tests and pull-request quality gates

- Added deterministic Jest coverage for API liveness metadata, database and optional Supabase readiness outcomes, request-ID propagation/generation, response correlation, and structured request log fields. Database and Supabase behavior is mocked; the suite does not depend on production services.
- Established a passing root `npm test` baseline through the existing workspace sequence. The API runs real Jest tests; the web workspace retains its explicit no-tests command until web test tooling is intentionally introduced.
- Replaced the standalone documentation-policy workflow with a non-deploying pull-request quality workflow for `main`. On Node.js 24 it uses `npm ci`, documentation validation, a tracked-file secret scan, root typecheck/build/test, independent API/web builds, and `git diff --check`.
- Preserved business logic, authentication, Prisma schema and migrations, Supabase configuration, Railway deployment, Cloudflare native deployment authority, and the disabled frontend deployment workflow.

## 2026-08-07 — Phase 1 API monitoring and operational hardening

- Split API monitoring into lightweight `GET /api/v1/health` liveness metadata and `GET /api/v1/ready` process, database, and configured Supabase Auth connectivity checks. Readiness returns HTTP 503 when a required dependency check fails without returning configuration values.
- Added safe request-ID propagation/generation, response correlation headers, structured JSON request completion and error records, and structured startup success/failure records. Logs exclude query strings, headers, bodies, credentials, and environment-variable values.
- Preserved Railway's `/api/v1/health` health-check path, deployment topology, authentication behavior, business logic, Prisma schema, migrations, and environment-variable inventory.
- Updated architecture, deployment, recovery, planning, and historical documentation with endpoint contracts and operational diagnosis workflows.

## 2026-08-07 — Railway API startup migration cleanup

- Removed the duplicate `prisma migrate deploy` invocation from the `@hestiva/api` start script. Railway continues to invoke the root `npm run deploy:api` command, which runs `db:migrate:deploy` once before starting the API workspace.
- Preserved the Railway build command, health check, root deployment entry point, Prisma schema and migrations, environment variable names, and the NestJS `node dist/main.js` process start.

## 2026-08-07 — Repository documentation policy

- Established the root `AGENTS.md` as the mandatory repository-wide Definition of Done and documentation update matrix for future Codex implementations.
- Added a pull-request consistency workflow and repository-local validator that reports meaningful implementation changes lacking a `docs/` update while excluding Markdown-only, comment-only, and license-only changes.
- Accepted ADR-0008 and documented the policy, historical preservation rules, PR evidence, and limits of automated enforcement.

This is the durable, detailed record of the Hestiva OS migration and production recovery. The six recovery commit identifiers below are preserved exactly even though they are not present in this checkout's reachable Git object set.

## Migration and recovery sequence

1. **`93ffb8f579ff821e8db8b3636a3419835404ef35` — initial recovery baseline.** Recovery work established a known source state and began reconciling repository identity and deployed services. The production stack was treated as three dependencies—Cloudflare web, Railway API, and Supabase—rather than attempting application changes before infrastructure health was understood.
2. **`52a9a1da92e438c518e874eeae56f60cb3a61387` — Railway workspace/build recovery.** The API deployment was aligned to the monorepo root so npm could resolve `@hestiva/api`. The verified build became `npm run build --workspace @hestiva/api`; the API remained a NestJS Railway service and its health contract remained `/api/v1/health`.
3. **`5b2670cec3e370b82489594d20b960fffe2f9549` — Railway startup and database recovery.** API startup was aligned to `npm run deploy:api`, ensuring Prisma migrations precede the process. Supabase database connectivity and environment configuration were recovered without committing values. The resulting known debt is that migrations execute twice: the root deploy script and API workspace start script both invoke deployment migrations.
4. **`dca46d1feba07445fde4eba66d73b52d79350ef5` — Cloudflare/OpenNext recovery.** The Next.js workspace was restored to an OpenNext Cloudflare Worker deployment, with the Worker identity `hestivaos`. Server and browser API configuration were separated through `API_URL` and `NEXT_PUBLIC_API_URL`, and required Supabase build variables were restored in the deployment environment.
5. **`ad4a9eb8b8c02c8ef105a3c7d4ab25d7971912eb` — deployment authority consolidation.** Cloudflare native Git builds were selected as the active web controller. The duplicate GitHub Actions Cloudflare workflow was disabled at the control plane, Railway web automatic deployments were disabled, and the Railway web service was retained temporarily for rollback only.
6. **`82462a6f76bb15c7e162c16d12439913654f06a1` — verification and stabilization.** Web/API reachability, Railway health, and recovered environment scopes were validated. Remaining debt was recorded rather than hidden: legacy `mmapi` in the Railway API hostname, double Prisma migration execution, absent API tests causing `npm test` to fail, and outstanding dependency review.

## Repository cleanup and review history

- **PR #34** performed the Hestiva OS technical cleanup and branding consolidation. It established the `hestiva-os`, `@hestiva/api`, and `@hestiva/web` identities and removed active legacy naming where safe without renaming the live Railway hostname.
- **PR #37** performed the repository-wide legacy naming audit and follow-up cleanup. It retained compatibility-sensitive production references intentionally and corrected local Hestiva OS database example naming.

Subsequent repository commits also corrected the Cloudflare deployment working directory and renamed the checked-in Worker configuration to `hestivaos`. The production conclusion remains: GitHub `main` is source, Cloudflare native Git owns web deployment, Railway owns API deployment, and Supabase owns database/Auth/Storage.

## Known state after recovery

- Railway API Root Directory is the repository root; build and start commands are documented in [Deployment](DEPLOYMENT.md).
- Cloudflare native Git builds are active. The GitHub Actions deployment path and Railway web automatic deployments are disabled.
- Railway web remains rollback-only and must be removed after confidence and rollback planning permit.
- Values were recovered into platform configuration, not committed.
- `npm test` fails because the API has no tests; this is known work, not a passing baseline.
- Dependency vulnerability review, monitoring, backups, controller cleanup verification, hostname migration, and account identity cleanup remain open.

## 2026-08-10 — Product Implementation Slice 5: Employee Records

Implemented the canonical lean Employee Records area. The additive Prisma model uses independent employment status and nullable unique links to unchanged User and Technician records; the migration intentionally creates no inferred legacy links. Added ADMIN-only NestJS endpoints, strict input validation, privacy-limited list selection, read-only User access/role and Technician crew summaries, and no delete operation. Added a server-authorized responsive `/employees` interface with the seven approved sections, explicit save feedback, duplicate-submit prevention, search, filtering, inactive retention, and a link to authoritative User Access management.

Focused Jest coverage verifies exact ADMIN authorization metadata, all four excluded roles, lean list privacy, creation without linked accounts, optional fields, unsupported-field and email rejection, logical dates, independent employment mutation, preserved Technician linkage, and lack of deletion. Documentation records deployment and recovery behavior, architectural rationale, scope exclusions, and deferred permissions.

## 2026-08-10 — Slice 5F customer flow and workforce navigation correction

Audited the Customer create request, API return, client success handler, Property preselection, relationship selectors, shared navigation shell, and Admin Settings. The deployed failure path used only a Next soft-router transition and had source-text coverage rather than execution-focused failure/ID guards. The corrected create-only branch validates the returned persisted UUID and performs a document navigation to Property create; update, rejected create, and invalid response branches do not navigate. Property creation retains its canonical Customer/Property continuation into Work Order creation.

Removed the duplicate Name input, made Contact name required, and kept the non-null historical `Customer.name` field without a schema change or backfill. The API mirrors Contact name into `name` on new records and explicit Contact name edits. A shared display helper prefers Contact name, falls back to legacy Name, and finally uses a safe generic label. Customer search retains both fields and includes existing email/phone discovery.

Replaced top-level workforce links with a shared Team disclosure containing Technicians, Crews, and Shift Planning. The native button exposes `aria-expanded`, opens for active child routes, and is reused in the mobile drawer, whose link callback closes the drawer. Employee Records is now an Admin Settings card and remains on its existing server-authorized route; Services remains an Admin Settings module. No protected authentication, CORS, catalogue, Prisma, role, deployment, or business-rule area changed.

## 2026-08-10 — Slice 5G website Property Types and ADMIN customer cleanup

- Verified the requested Property Type authority as `HestivaHQ/hestiva/src/routes/quote.tsx` and encoded only Apartment, Townhouse, House, Duplex, and Other in an idempotent, non-destructive migration.
- Inspected the Prisma ownership graph. Implemented ADMIN-only impact/deletion routes for Customer → Property/WorkOrder → Activity, ChecklistItem, Photo metadata, and CustomerSignOff. Work-order Shift links are detached; shared User, Service, Employee, Technician, Crew, BusinessListOption, BusinessProfile, Auth, and unrelated records are preserved.
- Kept normal Customer deletion unchanged. The dedicated deletion rechecks Customer/name/counts and executes explicit ordered operations in one transaction, returns real counts, and emits identifier/count-only logs.
- Added `/admin/settings/business-lists` and `/admin/settings/customer-data-cleanup`, corrected the Property empty-list link, and added responsive impact/confirmation presentation.
- Confirmed the repository has photo metadata CRUD but no safe Storage cleanup service. Database photo metadata is deleted; Supabase objects are not; the response reports orphan risk.
- Recorded the website Bedroom values Studio, 1, 2, 3, 4, and 5+ as future alignment only.

## 2026-08-10 — Slice 5H cleanup UX and automatic Work Order references

- Kept cleanup confirmation as an exact case-sensitive comparison and all existing ADMIN preview/atomic deletion behavior. Non-empty mismatches now identify the required display name in an accessible inline alert; cleanup-only disabled styling uses an opaque muted destructive treatment with readable text.
- Added nullable `WorkOrder.reference` and `serviceId` for history, a unique reference index, restrictive canonical Service relation, and `WorkOrderDailyCounter`. New creation validates an active Service and atomically upserts the Johannesburg `YYYYMMDD` counter in the same serializable transaction as Work Order/activity creation. Sequence 10000 raises a controlled error and rolls back. New non-null legacy titles receive the reference; historical rows are not backfilled.
- Removed create/edit title mutation, exposed the reference read-only, and centralized display fallback: reference falls back to legacy title, while the human label prefers canonical Service, Customer display name, and Property. Work Order queries include Service and reference search while retaining title, Customer, Property, description, and crew search. Customer → Property → Work Order preselection remains intact.

## 2026-08-10 — Slice 5I accepted-quote Work Order structure

Added nullable `WorkOrderFrequency`, `HomeCondition`, and custom-frequency support plus explicit `WorkOrderAddOn` rows in an additive migration. Retained Slice 5H `serviceId` rather than introducing an overlapping primary-service column; API creation now requires its canonical Service to be active and `PRIMARY`. Create/update validate canonical add-on IDs, type, newly assigned active status, duplicates, controlled enums, and CUSTOM-only notes. Relationship replacement deletes join rows only, never canonical Services, and unchanged inactive historical relationships remain readable.

The web form loads independently filtered active PRIMARY and ADD_ON catalogues, provides a dedicated checkbox list, human labels, and a read-only Property/access snapshot. List and technician detail surfaces display frequency, condition, and add-ons separately from the structured job label. Customer/Property query preselection, reference generation and immutability, scheduling, assignment, notes, checklist, photos, and sign-off behavior remain intact. No website endpoint, recurrence engine, new persistent Property field, canonical catalogue name, pricing, payment, or media-storage behavior was introduced.

## 2026-08-10 — Slice 5I-A Work Order add-on UI polish

Replaced the browser-default add-on fieldset presentation with a responsive, single-column/mobile and two-column/wide selector whose native checkbox labels provide full-row activation, visible checked and focus states, and a restrained hover treatment. Updated the supporting copy and empty state, and retained readable, removable inactive historical selections. Focused web coverage verifies the accessible associations, catalogue rendering, multi-selection state update, historical and empty states, user-facing copy, and unchanged active `ADD_ON` filtering.

This cosmetic correction changed no Work Order business/data behavior, API, Prisma model, catalogue, scheduling, or assignment implementation. The Technician/Crew redesign remains deferred to Slice 5N.

## 2026-08-10 — Slice 5J Property operational profile

- Audited the Property schema, API, form, Work Order summary, Technician job view, and verified quote-alignment records. Added four Prisma enums and nullable additive Property columns through migration `20260812120000_property_operational_profile`; no historical values are inferred.
- Added server-side enum/boolean validation, optional-note normalization, unsupported-field rejection, full-detail support, and an explicit identifying-only selector. Existing Property authorization, managed Property Type behavior, and dormant Province compatibility are unchanged.
- Grouped the responsive form into five progressive sections. Work Order surfaces read live Property information; Technician output is limited to actionable access and care facts. No Work Order profile columns, snapshots, recurrence, quote integration, catalogue changes, or assignment redesign were added.
- Repository evidence confirms Bedrooms and Property Types, but no approved floor-size, persistent outdoor, or entry-method vocabulary. Those controls and variable presence remain deferred rather than fabricated.

## 2026-08-10 — Slice 5K revised to current website vocabulary

- Re-audited the supplied authoritative `HestivaHQ/hestiva` `src/routes/quote.tsx` vocabulary. It contains no service-specific scopes, so removed all undeployed `ServiceScopeOption` implementation and historical claims rather than retaining unsupported schema.
- Found two real dual-context capabilities: Interior Window Cleaning and Laundry Folding. Extended `ServiceType` with `BOTH`, updated selector queries and Work Order validation, and migrated the existing stable records rather than creating duplicate Services.
- Reworked the undeployed 5K migration in place. It preserves all existing IDs and Work Orders, changes only the availability of the two matching canonical capabilities, and inserts six evidence-backed add-ons conflict-safely. Custom and inactive Services remain untouched.
- Extra refrigerator is deliberately not aliased to Inside Fridge Cleaning because it carries additional-unit semantics. Balcony or patio, Eco-friendly products, Post-renovation dust removal, and Extra refrigerator remain fail-closed pending product/commercial decisions.
- Updated the mapping reference with all 15 current add-ons, five current frequencies, current quote steps/required fields, and newly verified Property vocabularies. Property implementation and quote handoff remain outside 5K.

## 2026-08-10 — Slice 5J-A Property quote vocabulary alignment

Implemented the controlled values verified from `HestivaHQ/hestiva/src/routes/quote.tsx` and the revised quote mapping. Added an additive Prisma migration, type-aware API validation, conditional Property selectors, compatibility rendering, focused service tests, and live Work Order summary fields. Bathroom storage already represents every current website outcome; the website's dynamic bedroom-to-bathroom narrowing was not copied because it is quote UX rather than an operational data validity rule. No quote handoff, recurring agreement, assignment, or catalogue behavior was introduced.

## 2026-08-10 — PR #69 / PR #70 production migration recovery

- Audited all 23 migration directories, `schema.prisma`, and both affected SQL files. Lexical timestamp order places `20260810180000_property_quote_vocabulary` before `20260810233000_service_availability_and_addon_reconciliation`; 5J-A creates four nullable Property columns/types and extends bedroom/storey enums without using those newly added values, and has no 5K dependency.
- Root-caused PR #69's P3018/PostgreSQL 55P04 to adding and using `ServiceType.BOTH` in the same migration execution. The failed migration record then correctly causes P3009 to stop every later pending migration. The failed batch is expected to roll back, but repository access cannot verify production, so recovery requires read-only inspection and forbids `--applied` without proof of every intended effect.
- Preserved the production-visible failed migration name but reduced its repaired content to idempotent enum addition. Added immediately consecutive `20260810233100_service_availability_and_addon_data` for the two `BOTH` updates and six fixed-ID, conflict-safe add-ons. This gives both recovered production and clean installations the same final ordered history after an authorized `migrate resolve --rolled-back` of the verified rollback case.
- Added a PostgreSQL 17 pull-request job. Its guarded executable script replays the complete chain from zero and separately deploys through the pre-5K boundary before completing the chain, then asserts `BOTH`, both dual-context services, all six canonical add-on IDs, all 5J-A columns, and no unresolved Prisma migration row.
- Added exact read-only production queries and a stop-on-mixed-state operator procedure. No production connection was available or used; no database was reset, schema dropped, migration history deleted, or production state mutated.

## 2026-08-10 — PR #71 PostgreSQL clean-replay defect correction

- The new PostgreSQL 17 gate failed authoritatively at `20260810180000_property_quote_vocabulary` with PostgreSQL 42704/Prisma P3018 because `BedroomCount` did not exist; `StoreyCount` had the same defect. Full chronological inspection found both types and the `bedrooms`, `bathrooms`, `living_areas`, and `storeys` columns originated only in lexically later `20260812120000_property_operational_profile`. Their presence in the current Prisma schema and previously migrated databases had hidden the incomplete clean history.
- Audited every schema enum against all migration `CREATE TYPE` statements and inspected every 5J-A/5K dependency. No additional missing type, table, or column dependency was found. `ServiceType` and `services.type` originate in `20260810220000_canonical_service_catalogue`, before both repaired 5K files; the separate `BOTH` commit boundary remains intact.
- Modified 5J-A so it creates the complete Bedroom/Storey enums only when absent and otherwise adds only missing compatibility values. Modified the already-deployed profile migration to conditionally create its four types and use `ADD COLUMN IF NOT EXISTS`. This historical edit is required for deterministic empty-database replay; it is non-destructive, and already-applied production rows are not rerun by `migrate deploy`.
- Strengthened clean/staged replay assertions to require all eight profile/vocabulary types and columns, all added Bedroom/Storey values, every migration finished, no unresolved migration, and the existing 5K outcomes. Added a source regression test for the compatibility contract.

## 2026-08-10 — PR #71 staged PostgreSQL harness repair

- CI proved the repaired clean PostgreSQL 17 replay passes. Staged mode then stopped before Prisma execution because the script attempted to copy `apps/api/prisma/migrations/migration_lock.toml`; filesystem inspection confirmed the repository contains no `migration_lock.toml`. The path came from an unsupported assumption in the first harness implementation, not from Prisma or runner-specific layout.
- Removed that copy and replaced the fragile exclusion list with lexical selection of every checked-in migration directory strictly before `20260810233000_service_availability_and_addon_reconciliation`. The temporary workspace contains the real `schema.prisma` and those real directories in Prisma's expected sibling `migrations/` layout.
- Added staged-phase assertions for the exact finished migration count and absence of any migration at or beyond the 5K boundary before deploying the full repository chain. Existing final assertions still require no unresolved history, all Property enums/columns, `ServiceType.BOTH`, both dual-context Services, and all six canonical add-ons.

## 2026-08-11 — Slice 5L recurring service agreement architecture

Implemented `RecurringServiceAgreement` and its canonical add-on join, structured recurrence fields, lifecycle, preferred time window, and a nullable unique occurrence link on Work Order. The calculation module uses Johannesburg calendar dates, stable effective-date biweekly anchoring, monthly final-day clamping, inclusive end dates, and no automatic CUSTOM behavior.

Added role-protected CRUD/lifecycle and explicit generation APIs plus the operational Recurring services screen. Generation runs serializably, preserves the standard reference counter/activity path, refuses backlog and duplicate future generation, and relies on a database unique occurrence constraint under concurrency. Generated visits snapshot current service/add-ons/frequency/instructions and remain independent. Customer cleanup now counts and removes Property-owned agreements after Work Orders. Added recurrence and timezone tests; documentation and ADR-0026 record the verified boundaries and deferrals.
## 2026-08-13 — Local Supabase JWT verification performance pass

- Replaced the global API guard's per-request Supabase Auth `/auth/v1/user` verification call with cryptographic local ES256 verification against the Supabase project's public JWKS. This removes the provider Auth-server network round trip from normal protected API requests after JWKS warm-up.
- Verified the production Supabase project uses the current asymmetric ECC P-256 signing-key configuration before approving the local-verification design. No private signing key, service-role credential, or new JWT dependency was added to the repository.
- Added an in-process ten-minute JWKS cache and one forced refresh when a token presents an unknown `kid`, allowing normal signing-key rotation discovery while remaining fail closed.
- The verifier requires ES256, a known signing key, a valid cryptographic signature, the exact project Auth issuer, `authenticated` audience, non-empty subject, expiry, and optional not-before validity with a narrow clock-skew allowance. Malformed or unverifiable credentials remain unauthorized.
- Preserved ADR-0014 application authorization: the HestivaOS User lookup, ACTIVE-status check, route-role enforcement, and narrow `/users/sync` bootstrap exception remain after provider-token verification.
- Reworked guard tests to generate real P-256 test keys and signed JWTs, mock only the public JWKS fetch, and cover valid ADMIN access, non-admin role rejection, disabled-user rejection, expired-token rejection, and wrong-audience rejection.
- Updated the performance audit, environment inventory, recovery guidance, architecture description, changelog, and ADR index; added ADR-0033 for the durable authentication-boundary decision.