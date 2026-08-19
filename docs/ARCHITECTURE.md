# Production architecture

## Dashboard Needs Attention foundation (2026-08-18)

The existing authenticated Dashboard remains the HestivaOS Today/Operations command centre; there is no parallel Operations product. The current presentation hierarchy is **Needs Attention → Today’s Work → Shortcuts → Upcoming**. This section supersedes older dashboard hierarchy wording below where those historical descriptions conflict with the current presentation. `GET /api/v1/dashboard` remains the compatibility/current-work data source for today and upcoming summaries, while the protected `GET /api/v1/attention?view=mine|all` boundary owns actionable exception reconciliation and read state.

`AttentionItem` is a durable derived-control record rather than a second source of operational truth. A database-unique deterministic `conditionKey` identifies one stable condition; `AttentionItemActivity` preserves OPENED, REOPENED, SEEN, assignment/reassignment and automatic-resolution history. Phase 1 produces only Work Order conditions HestivaOS can prove from current authoritative data: today-unassigned work (no Crew and no normalized `WorkOrderTechnician` assignment), overdue operationally unresolved work, and Technician-completed work awaiting the existing ADMIN/SUPERVISOR completion acknowledgement. Healthy states stay absent from the queue. When a source condition clears, reconciliation marks the occurrence resolved without deleting history; if the same condition returns later, the same item reopens with a new occurrence count and cleared stale owner/Seen state.

Priority and visibility are deterministic. Overdue Work Orders are `CRITICAL`, today-unassigned Work Orders are `HIGH`, and completion acknowledgement is `NORMAL`; equal-priority items sort by real due time and then current occurrence age. `OPERATIONS` ownership is available to active ADMIN, OPERATIONS_MANAGER, DISPATCHER and SUPERVISOR users; `MANAGEMENT_REVIEW` is available to active ADMIN and SUPERVISOR users. Mine includes the current user's assigned items plus unassigned items in eligible queues, with every unresolved Critical item remaining visible to ADMIN even when assigned elsewhere. All returns every unresolved item in role-visible queues. Seen records first actor/time and is explicitly not resolution. If an owner becomes inactive or loses queue eligibility, reconciliation returns the item to its eligible queue and records that reassignment.

Reconciliation runs in a bounded-retry PostgreSQL `SERIALIZABLE` transaction, retrying serialization and first-observation uniqueness races. Database uniqueness on `conditionKey` is the final same-condition duplicate boundary. Phase 1 exposes no manual attention resolve action: operators follow the direct Work Order deep link and correct the authoritative condition. Snooze/delegation, active notification delivery, automated handover, AI scoring, and Finance/Correspondence/Access/Messaging/Worker-Issue/Job-Exception producers remain separate work until their authoritative domains support them. See ADR-0053 and `NEEDS_ATTENTION_FOUNDATION_V1.md`.

## ADMIN Quote review UI (2026-08-16)

The Next.js `/quotes` and `/quotes/[id]` routes provide the ADMIN-only operational queue and review workspace over the established Quote controller. The shared shell filters the Quotes navigation item by the synchronized application role, while the server pages redirect non-ADMIN users and the Nest controller remains the authoritative authorization boundary. The queue uses the protected list read model for current-revision customer/service/date summaries and prioritizes actionable statuses without exposing commercial detail outside the review route.

Detail uses backend preflight as the acceptance authority and progressively presents blockers, current request and revision, Customer/Property resolution, operational handoff, immutable revision pricing, customer Quote photos, readable activity, and terminal operational links. Resolution, Accept, and Decline always send the reviewed `expectedRevisionNumber`. Accept refreshes preflight before opening a native confirmation dialog, disables duplicate submission, and re-reads Quote state after an uncertain network result rather than automatically repeating the mutation. Pricing is rendered only from stored revision minor-unit values. Generic Quote reads contain no temporary credential secret model; secure credential management remains separate planned work.

## Atomic accepted-Quote operational conversion

`PATCH /api/v1/quotes/:id/accept` is ADMIN-only and dispatches the immutable current submission by frequency. ONE_TIME retains its single-Work-Order path. Canonical `WEEKLY`, `EVERY_TWO_WEEKS`, `MONTHLY`, and `CUSTOM` use the same bounded-retry `SERIALIZABLE` transaction to resolve/materialize Customer and Property, create one `RecurringServiceAgreement`, create its initial `NEW` Work Order, link the exact revision and both operational records, and append audit activity. The preferred date becomes the agreement effective date and initial recurrence date; standard recurrence derives weekday/day-of-month, while CUSTOM retains its required note and is not bulk-generated.

Agreement and initial visit preserve primary Service, frequency, supported instructions, exact generic/Laundry/Ironing add-on quantities, preferred time and eco-product preference; the initial visit also preserves home condition and all typed visit context. Later generated visits inherit only agreement-owned stable context. Accepted pricing stays on the immutable revision and is presented in the ADMIN review UI. Website ingestion and ordinary recurring CRUD behavior are unchanged.

## Atomic ONE_TIME Quote acceptance (Slice 5M, 2026-08-16)

`PATCH /api/v1/quotes/:id/accept` is an authenticated ADMIN-only conversion. It requires `expectedRevisionNumber`, a current durable Customer/Property resolution, `SUBMITTED` and unexpired state, stored Quote evidence, `ONE_TIME` frequency, and resolvable active canonical primary/add-on Services. Preflight applies the same deterministic revision, state, resolution, evidence, and operational-projection blockers; it reports ready only when acceptance is not guaranteed to fail for a known blocker.

Acceptance is one Prisma/PostgreSQL `SERIALIZABLE` transaction with bounded serialization-conflict retries. It validates the immutable current revision, uses the exact selected Customer/Property or creates them inside the transaction, allocates the standard Work Order reference, creates the Work Order/add-ons/activity, stores the exact accepted revision, links Customer/Property/WorkOrder, writes actor/time/status metadata, and appends Quote status activity. A conditional transition, unique Work Order/revision links, restricted Customer/Property foreign keys, and the database accepted-state shape constraint prevent partial or duplicate successful conversion. An identical complete retry returns the existing result; incompatible state fails closed.

The Work Order projects primary Service, ONE_TIME frequency, home condition, preferred/alternative timing, flexibility, urgency, exact floor/building access, visit access/key/parking/presence details, eco-product preference, customer-declared existing damage, supported visit description, accepted-revision photo references, and canonical add-ons with exact positive quantities. New Properties receive established address/profile/household/care fields; existing canonical records are not overwritten. Pricing remains on the accepted revision and is reached through the Quote's exact operational and revision links. Supported recurring Quotes use the recurring agreement plus initial-visit path described above; ONE_TIME creates no `RecurringServiceAgreement`.

## Quote Customer and Property match-or-review (Slice 5M, 2026-08-15)

ADMIN Quote detail and preflight now derive fail-safe Customer and Property match results from the immutable current revision. Customer matching uses the submitted canonical E.164 mobile and normalized lower-case email: one consistent identifier result is exact, disagreement is review-required, multiple records are ambiguous, and name alone never selects a Customer. Property matching is limited to the resolved Customer and compares normalized address line, suburb/city, postal code, and country. It never uses access, parking, key, pet, safety, or visit notes and never updates a Property.

`PATCH /api/v1/quotes/:id/resolution` records paired `USE_EXISTING`/`CREATE_NEW` intent, optional selected IDs, and the source revision. The ADMIN-only serializable compare-and-set creates an append-only `MATCH_RESOLUTION_RECORDED` activity, permits an identical retry, and rejects stale, concurrent, conflicting, missing, or cross-Customer selections. It creates no operational entity. At this historical match-foundation checkpoint preflight exposed candidates with identifier, display context, and evidence category plus `READY`, `REVIEW_REQUIRED`, or `BLOCKED`, while conversion remained an unconditional blocker; the 2026-08-16 ONE_TIME conversion supersedes that blocker.

## Internal Quote review and decision foundation (2026-08-15)

The authenticated API exposes ADMIN-only `GET /api/v1/quotes`, `GET /api/v1/quotes/:id`, `GET /api/v1/quotes/:id/preflight?expectedRevisionNumber=...`, and `PATCH /api/v1/quotes/:id/decline`. This internal controller is separate from guarded Website ingestion. Detail resolves the exact `currentRevisionNumber` and returns its immutable structured request, pricing snapshot, line items, Quote photo metadata and append-only activities. Preflight performs no mutation and reports current deterministic blockers together with deferred Customer/Property and atomic operational-conversion work.

Decline is terminal and revision-checked. An eligible `SUBMITTED` or `NEEDS_ATTENTION` Quote transitions to `DECLINED` with actor/time and a `STATUS_CHANGED` activity in one serializable transaction. Identical retries return the existing decision; stale revisions, conflicting retries, concurrent decisions and incompatible terminal states fail closed. At this historical foundation checkpoint there was deliberately no Accept endpoint; the 2026-08-16 ONE_TIME conversion above supersedes that limitation.

`Quote.acceptedRevisionId` is a nullable unique restricted foreign key to the immutable revision selected by acceptance. Quote links to Work Order and Recurring Service Agreement are also nullable unique restricted foreign keys. This historical foundation created no operational records; the later ONE_TIME transaction described above now enforces same-Quote revision ownership and the ONE_TIME link shape in the service.

## Website Quote v2 review-required intake correction (2026-08-15)

The production Website → HestivaOS Quote boundary remains the guarded server-to-server `POST /api/v1/integrations/website/quotes` route authenticated by the dedicated Website integration bearer secret. Contract validation, immutable submission replay/conflict classification, HestivaOS-owned pricing, serializable Quote persistence, and authoritative `Q-YYYYMMDD-####` references remain on the HestivaOS side.

A valid authenticated Contract v2 submission is no longer discarded solely because one or more authoritative operational-cost components cannot yet be completed from the submitted facts. The ingestion service resolves costs first; a complete cost snapshot follows the normal profitability-floor calculation, while an incomplete/ambiguous cost snapshot uses the existing review-required pricing result and persists the Quote as `NEEDS_ATTENTION`. The Quote retains the customer submission, authoritative reference, non-final pricing snapshot, attention reasons, and unresolved cost/provenance metadata. This preserves the customer request without fabricating missing costs or treating the stored amount as a final profitability-protected quotation. Acceptance and operational progression remain blocked until review resolves the outstanding facts.

Contract v2 also corrects Townhouse layout semantics without rewriting historical v1 compatibility. Apartment continues to require exact floor and building-access transport. Townhouse v2 is storey-based and does not inherit the Apartment 0–50 exact-floor/elevator-or-stairs requirement. Contract v1 retains its historical validation behavior for backward compatibility; the live Website uses v2.

Failures at the actual trust/persistence boundary remain fail-closed: invalid authentication, malformed/unsupported contract data, immutable-submission conflicts/corruption, database failures, and exhausted daily Quote-reference capacity do not become successful Quote intake. Incomplete commercial or operational costing facts instead become durable review work because the shared Quote domain and Website contract already support `NEEDS_ATTENTION` as a non-final state.

## Operational continuation, identity presentation, and controlled deletion

The shared authenticated `AppFrame` resolves `POST /users/sync` when its caller has not already supplied an application User. Desktop and mobile account presentations then receive that same authoritative `AppUser` and display its application role; neither presentation invents a Technician role while identity is unresolved. Supabase Auth remains the authentication identity authority and the application `User` remains the role and OS-access authority.

The primary navigation follows Dashboard → Customers → Properties → Work orders → Team → My profile. Team is an accessible disclosure containing Technicians, Crews, and Shift Planning in that order; desktop and mobile presentations use the same item source. Employee Records and canonical Service catalogue management belong to Admin Settings, so neither is promoted in primary operational navigation. The existing `/employees` authorization and `/services` authenticated read-only route remain unchanged.

Successful new Customer creation validates the returned persisted ID and uses a document navigation to `/properties?mode=create&customerId=…`; Customer edits do not continue to Property creation. Successful Property creation continues to `/work-orders?mode=create&customerId=…&propertyId=…`. The IDs are canonical persisted relationship IDs. Each receiving form verifies the requested record exists in its loaded authorized catalogue; Work Order preselection additionally verifies that the Property belongs to the Customer. Missing, unknown, or mismatched deep-link values produce a validation message and do not create a record. Work Order creation preserves this preselection and requires a canonical active Service selection.

Customer deletion is permanent only for a Customer with no Properties and no Work Orders. The service checks both relationships before invoking Prisma deletion: operational history or linked Properties return a controlled HTTP 409 response, preserving all related records and preventing the schema's Property cascade from being used as a product workflow. Unexpected faults retain normal server-error handling. This is the current narrow application of the product rule that expected domain rejection is not an internal server error.

Property Type remains the optional `PROPERTY_TYPE` Business List relationship. New assignment offers active options only; an empty catalogue displays an unassigned prompt rather than a fabricated “Not classified” taxonomy, while an inactive existing assignment remains readable during editing. Province remains a nullable database/API compatibility field and existing values remain readable wherever Property addresses are rendered, but ordinary Property create/edit forms omit it and do not overwrite stored Province values.

## Canonical service catalogue

Hestiva OS owns the operational service catalogue. `Service` has `PRIMARY`, `ADD_ON`, or `BOTH` booking-context availability, an active/inactive lifecycle, and a nullable unique normalized key used for safe case/whitespace comparison. `BOTH` keeps one canonical capability when it can be the Work Order primary Service or a Work Order add-on; primary validation accepts `PRIMARY`/`BOTH`, while add-on validation accepts `ADD_ON`/`BOTH`. Existing IDs and Cleaning Job Template relationships are preserved. Authenticated operational users may read the catalogue; only ADMIN may create, edit, deactivate, or reactivate records at `/admin/settings/services`. `/services` is an active, read-only operational catalogue. New template assignments reject inactive Services while existing templates continue to include and display inactive historical relationships.

The initial catalogue was reconciled from the supplied, verified `HestivaHQ/hestiva` sources `src/content/services.ts` and `src/lib/quote-options.ts`. The public-page name `Eco-Conscious Cleaning` is canonical and `Eco-Friendly Cleaning` is its recognized quote-form alias. The migration does not create `Multiple Services Required`, `Other (Please Describe)`, or the `Cleaning Add-On Services` landing/grouping page. Website synchronization is not live-coupled. The current `src/routes/quote.tsx` has no approved service-scope inputs, so no Service Scope schema, API, or UI exists. Cleaning Job Templates remain reusable operational task definitions. `docs/QUOTE_TO_OS_VALUE_MAPPING.md` owns the fail-closed current vocabulary mapping for future quote handoff.

## Authoritative Quote domain foundation (Slice 5M-A, 2026-08-11)

HestivaOS now owns the durable Quote aggregate used by the website, future Admin/manual capture, and future WhatsApp integration. `Quote` owns the stable public reference, lifecycle status, validity boundary, current revision pointer, and future operational linkage slots. A required database-unique `submissionKey` is separate from the human-facing `Q-...` reference and is the durable idempotency identity that later ingestion services must reuse across retries; repeating a submission key must resolve to the same Quote rather than creating another Quote.

`QuoteRevision` is the immutable structured submission and pricing snapshot for a specific revision. It stores integer minor-unit pricing with initial `ZAR`, subtotal, optional Admin discount plus reason, dormant tax fields, and total. `QuoteLineItem` preserves line type, label/code, quantity, unit amount and line total. Later pricing-rule changes do not rewrite historical revisions. The foundation stores structured quote data as JSON; the typed website/API contract and pricing calculator are intentionally deferred to the next Slice 5M sub-slice.

`QuotePhoto` is the durable owner of customer-submitted and later Admin-added quote evidence. Each photo has a required database-unique `transferKey` so repeated transfer attempts cannot create duplicate photo records, plus `PENDING`/`STORED`/`FAILED` state and provenance metadata. Work Orders will reference the applicable Quote assets later rather than duplicating them into Work Order photo ownership. `QuoteActivity` is the append-only Quote-domain history, and `QuoteDailyCounter` is the atomic sequence primitive for future `Q-YYYYMMDD-####` generation.

This foundation does not yet expose a website endpoint, calculate pricing, issue or validate Accept/Decline links, match/create Customers or Properties, or create Work Orders/Recurring Service Agreements. The nullable operational IDs are non-enforced linkage slots until the later handoff transaction supplies validated relations. `NEEDS_ATTENTION` and photo transfer states provide durable recovery state, but retry execution and Admin alerting are later service-layer work.

## Website Quote contract boundary (Slice 5M-B, 2026-08-11)

The website integration boundary is now a versioned structured contract rather than the website's human-readable email description. `WebsiteQuoteSubmissionV1` is `schemaVersion: "1.0"` with a stable website-generated UUID `submissionId`, constant `HESTIVA_WEBSITE` provenance, canonical UTC submission time, and explicit Customer, Property, Service Request, Visit Preference, Access, Household, Safety, Notes, and Customer Quote Photo structures. Website prose may still be rendered for people, but HestivaOS never parses that prose to reconstruct structured facts.

The approved transport is private server-to-server HTTPS at `POST /api/integrations/website/quotes` using a dedicated server-side bearer secret named `HESTIVA_WEBSITE_INTEGRATION_SECRET`. The browser must never receive the secret or call the private route directly. Slice 5M-B records this trust boundary and the TypeScript validation contract but intentionally does **not** expose the runtime controller yet; no request may be accepted before authentication, authoritative pricing, idempotent replay/conflict handling, photo storage/reconciliation, and atomic Quote persistence exist together.

The external `submissionId` maps to the durable Quote submission identity introduced in 5M-A and is separate from the public `Q-YYYYMMDD-####` reference. Same identity plus the same material payload must replay the existing Quote/reference/pricing snapshot; reuse with materially different content is a conflict. Customer photos use stable `clientPhotoId` plus SHA-256 provenance. Same photo identity/hash reuses one stored Quote-owned asset; same identity with a different hash is a conflict. The current schema already has Quote photo transfer identity/status, but it does not yet persist SHA-256; that storage adapter remains later runtime work and is not presented as implemented by this contract slice.

The Property contract preserves the deterministic current Property vocabulary and introduces exact Apartment/Townhouse floor transport as integer 0–50 plus building access. The existing persistent `Property.unitFloor` is grouped and therefore cannot represent all of that precision. Slice 5M-B validates and documents the exact field but does not add a Property column; later accepted-handoff work must add/own a non-lossy operational destination before importing the value.

Service payloads carry both the exact website value and explicit canonical mapping. `Add-on Services` and `Not sure` are the only approved review-required primary pseudo choices and use `canonicalService: null`; unknown values fail closed with no fuzzy aliasing. `Post-Renovation Cleaning` is a primary-service intent while `RECENTLY_RENOVATED` remains an independent Home Condition. Extra Refrigerator and Balcony / Patio Cleaning carry explicit positive-integer quantity; other v1 add-ons use quantity one. Eco-friendly products is a boolean preference, not an add-on. Current website frequency restrictions are enforced only where verified; no new restriction is fabricated for a service whose current website rule is not established.

HestivaOS remains the single pricing authority. The successful contract response contains the official Quote reference plus an immutable pricing snapshot in integer ZAR minor units: subtotal, signed adjustments aggregate, total, and stable-coded line breakdown. The merged Quote persistence model has subtotal/discount/tax/total and line storage, but the pricing calculator and external `adjustmentsMinor`/line adapter are not implemented in 5M-B. A later runtime slice must calculate and persist the snapshot atomically before returning success; an idempotent replay must return the same stored snapshot without recalculating under newer rules. VAT remains dormant internally and is omitted from the customer-facing v1 response while disabled.

The authoritative consumer description is [`WEBSITE_QUOTE_CONTRACT_V1.md`](WEBSITE_QUOTE_CONTRACT_V1.md). ADR-0028 records the versioning and ownership decision, and `QUOTE_TO_OS_VALUE_MAPPING.md` retains the earlier Slice 5K analysis as historical context while marking resolved 5M contract rules as superseding it.

Hestiva OS is an npm-workspace monorepo owned in GitHub by `HestivaHQ/HestivaOS`; `main` is the default branch and source of truth.

```text
 Users (browser)
       |
       v
 Cloudflare Worker: hestivaos
 Next.js web (@hestiva/web), built with OpenNext
       |  API_URL (server) / NEXT_PUBLIC_API_URL (browser)
       v
 Railway: NestJS API (@hestiva/api) ---- liveness: /api/v1/health
                                      \-- readiness: /api/v1/ready
       |                 |
       | Prisma          | validates Supabase authentication
       v                 v
 Supabase PostgreSQL   Supabase Auth
       ^
       |
 Supabase Storage <---- web uploads/reads authorized assets

 GitHub main --native Git build--> Cloudflare
 GitHub main --automatic deploy--> Railway API
```

## Components and ownership

- **Frontend:** `@hestiva/web` is Next.js 16.3.0 rendered by the Cloudflare Worker `hestivaos` through OpenNext. Cloudflare owns web build execution, edge runtime, static assets, and web observability.
- **API:** `@hestiva/api` is NestJS on Railway. It exposes versioned HTTP routes, lightweight liveness at `/api/v1/health`, and dependency readiness at `/api/v1/ready`. Railway owns API build, process lifecycle, health checks, and API networking. API requests and errors produce structured JSON logs correlated by the response's `X-Request-ID` header.
- **Database:** Supabase PostgreSQL is accessed by the API through Prisma. Prisma migrations run before API process startup. PostgreSQL enum additions and statements that use those values are kept in consecutive migration files so the enum addition commits first. Historical compatibility migrations use deterministic existence checks where merge chronology and lexical timestamps differ; pull requests replay the full chain and a staged pre-change database against PostgreSQL.
- **Repository bootstrap:** Root dependency installation runs the root `postinstall` lifecycle, which generates Prisma Client from `apps/api/prisma/schema.prisma` before workspace typecheck, build, or test commands consume `@prisma/client` types. API builds compile the already-generated client rather than generating it again.
- **Authentication:** Supabase Auth issues user credentials; the API validates them with configured Supabase project values. Authentication is not provided by Railway or Cloudflare.

Supabase Auth identities and application `User` records have distinct lifecycles and are associated by `users.auth_user_id`. `POST /api/v1/users/sync` first resolves the authenticated Auth UUID. If it is absent but exactly one application user matches the normalized authenticated email, the service changes only that existing user's Auth association when Supabase supplies `email_confirmed_at`. This preserves the application user ID, role, profile, and all foreign-key relationships. Unverified, conflicting, ambiguous, and concurrent uniqueness states fail closed with a controlled response and identifier-only diagnostics. A user with no UUID or email match retains the existing default-user creation path.
- **Storage:** Supabase Storage holds profile and work-order assets; configured bucket names identify the relevant buckets.
- **Source control:** GitHub repository `HestivaHQ/HestivaOS`, default branch `main`, is the authoritative code history and deployment input.
- **Deployment:** Cloudflare native Git builds are the sole active web deployment authority. The production build environment in Cloudflare owns browser-exposed `NEXT_PUBLIC_*` values, while `apps/web/wrangler.jsonc` owns repository-declared Worker runtime configuration and preserves deliberately platform-managed runtime variables. Railway automatically deploys only the API. The former GitHub Actions web deploy has been removed, Railway web auto-deploy is disabled, and the retained Railway web service is rollback-only.
- **Pull-request verification:** `.github/workflows/pr-quality-gates.yml` verifies pull requests targeting `main` on Node.js 24. It installs the locked root dependency graph, validates documentation, scans tracked files for high-confidence secret formats, type-checks, builds, tests, independently builds both workspaces, and checks patch whitespace. It has read-only repository permission and contains no deployment step or production credentials.
- **Frontend framework compatibility:** Next.js 16 uses its default Turbopack build path. The application has no custom webpack configuration or webpack-injecting plugin. OpenNext 1.20.2 declares compatibility with Next.js 16.3.0. The existing `middleware.ts` remains the Supabase session-refresh and route-protection boundary; Next.js 16 deprecates that convention in favor of `proxy`, so renaming is tracked separately rather than mixed into the security migration.
- **Dependency audit diagnostic:** `.github/workflows/dependency-security-audit.yml` is a temporary, manual-only Node.js 24 diagnostic. It installs the locked dependency graph, verifies the existing Prisma bootstrap, records npm security and outdated-package results, and retains the JSON audit report for 14 days. It has read-only repository permission, receives no production credentials, does not mutate dependencies, and cannot deploy.

## Request and data flow

The browser requests the Cloudflare Worker. Server-rendered web code uses `API_URL`; browser code uses the build-time `NEXT_PUBLIC_API_URL` to call the Railway API. The API applies application rules, validates Supabase identities, and reads or writes Supabase PostgreSQL through Prisma. Web features use Supabase authentication and Storage with public client configuration embedded during the frontend build. `NEXT_PUBLIC_*` values are intentionally browser-visible and require a rebuild when changed. Railway owns API runtime configuration. Cross-origin browser access uses a credential-capable, explicit `CORS_ALLOWED_ORIGINS` allowlist; API startup normalizes whitespace and trailing slashes and advertises the application methods plus authenticated JSON headers without allowing arbitrary origins. Secret values remain in each platform's protected settings, never Git.

The current Railway API hostname contains the legacy `mmapi` name. It is an endpoint compatibility detail, not the product or service identity, and is scheduled for migration.

## User access management

`/admin/settings/user-access` is the canonical ADMIN-only management route. Its server-rendered page verifies the synchronized application role before requesting `GET /api/v1/users/admin`; the API independently applies ADMIN metadata to listing and narrowly scoped role/access mutation routes. The list exposes identity, application role, and OS access state only. It contains no employee-record fields, and last authenticated activity is labelled unavailable because no verified source is stored.

Supabase Auth remains identity and credential authority. `User.role` remains the single application authorization role, and `User.status` now explicitly represents Hestiva OS access. This does not represent continued employment: the existing separate `Technician.status` is the current workforce status. Role changes do not edit Supabase claims or Auth identities.

Except for explicit health/readiness routes, the API globally validates the bearer token, resolves the application User, and rejects an `INACTIVE` user before a controller runs. `/users/sync` permits a valid identity with no application record solely for existing bootstrap and verified stale-identity reconciliation. Thus disabling access prevents future bootstrap and blocks an existing session at its next Hestiva API request. The web bootstrap signs out after the controlled disabled-access response. Supabase provider sessions are not globally revoked because no service-role administration capability exists in the repository; service-role credentials are never exposed to the browser.

ADMIN role/access mutations serialize on a transaction-scoped PostgreSQL advisory lock and execute the active-admin check and update in one serializable transaction. They reject removal of the last active ADMIN and conservatively reject self-demotion/self-disable. Permanent deletion is deferred rather than risking operational foreign-key history, and account creation/invitations are deferred pending a focused Supabase Admin design. Changes emit identifier-only server audit logs; persistent product audit history is deferred because the schema has no suitable general audit model.

## Admin dashboard product slice

This section is historical context for the original daily-command-centre slice. Its earlier hierarchy wording is superseded by the 2026-08-18 Dashboard Needs Attention foundation above. The current Dashboard remains a Next.js Server Component inside `AppFrame`; client boundaries are limited to focused interactive components such as the shared disclosure controls, responsive navigation and the Needs Attention panel. Legacy analytics, technician workload and recent-activity response fields remain compatibility data rather than current Dashboard presentations.

`GET /api/v1/dashboard` retains its existing response and `operationalDashboard`. The additive field supplies an Africa/Johannesburg operational date, a today-only status breakdown, real unassigned and overdue conditions, and date-grouped totals for the next seven calendar days excluding today. Dashboard date boundaries are calculated independently of the API host timezone. Current Workload excludes `CLOSED`, `CANCELLED`, and the legacy `WAITING_FOR_PARTS` presentation. Upcoming Work treats every calendar day equally. Needs Attention now owns the durable actionable exception lifecycle through its separate `/api/v1/attention` boundary; the older dashboard counters remain compatibility/current-work context, not a competing alert authority.

`WorkOrder.reference` is a nullable, database-unique permanent identifier for additive historical compatibility. New records receive `WO-YYYYMMDD-####` server-side from the Africa/Johannesburg creation day and an atomic daily counter inside the creation transaction; the sequence is capped at 9999. `serviceId` is nullable for history but a canonical active Service is required for new work. The non-null legacy `title` remains preserved and is populated with the reference for new rows. UI labels derive Service, Customer display name, and Property label, then fall back to legacy title. References never encode PII and are not changed by later scheduling or relationship edits. Property address fields provide the compact location. Normalized Work Order Technician assignments and Crew assignment now determine current assignment state. Worker Issue and Job Exception attention producers are not emitted because corresponding functional models do not yet exist.

## Profile and administrative settings boundary

The existing application `User` remains the single profile record and Supabase Auth remains the authentication identity and credential authority. `PATCH /api/v1/users/me/profile` accepts only `firstName`, `lastName`, `displayName`, `phoneNumber`, and `profilePhotoUrl`; it does not update email, role, job title, or department. Existing workforce-related columns and role enums remain unchanged for future modules.

The web application displays the Supabase-authenticated email read-only and sends password changes directly to the installed Supabase client through `auth.updateUser({ password })`; passwords never pass through or persist in the Hestiva API. The canonical `/admin/settings` route synchronizes the authenticated application User on the server and renders only when that record has the exact `ADMIN` role. All other roles redirect to the dashboard. Its User Access and Business Profile cards link to their implemented management routes.

## Canonical Business Profile

`BusinessProfile` is the single authoritative in-OS company-information record. The database restricts its primary key to `hestiva`; the API always addresses that key and returns only business fields and share booleans. Typed fields are organized in exactly three presentation and future permission boundaries: General Business Information, Banking & Payment Information, and Compliance & Official Information. The model deliberately contains no authentication, banking-login, PIN, OTP, token, or generic secret fields.

`GET` and `PATCH /api/v1/admin/business-profile` require the exact `ADMIN` role through controller metadata and the global authenticated-user guard. The web route also checks the synchronized role before reading. Updates use an explicit allowlist and return neither the singleton key nor timestamps. Mutation logs contain the actor identifier and changed field names only; persistent audit history is deferred because the repository has no appropriate general audit model.

Each shareable field has a persisted boolean. General customer-facing fields default on; banking and compliance fields default off. These are content-selection preferences, not field authorization. WhatsApp uses a recipient-less `wa.me` open, email uses `mailto:`, and copy uses the browser clipboard with a fallback; there is no outbound messaging backend. The formatter includes only selected non-empty approved fields. Completeness is the percentage of five non-empty core fields: registered name, registration number, contact number, business email, and business address. Optional banking, VAT, tax, website, and trading-name values do not affect it. Future management view/share group permissions and reuse for quotations, invoices, email, and generated documents are deferred; canonical editing remains ADMIN-only.

## Product Implementation Slice 5 — Employee Records

`EmployeeRecord` is the canonical lean workforce/employment record for administrators. It stores a human-entered employee reference; identity and operational contact data; one primary emergency contact; independent `ACTIVE`/`INACTIVE` employment status; job title, department, start/end dates; residential address; and internal operational notes. It deliberately excludes credentials, payroll, leave, performance, benefits, recruitment, training, document storage, and other full-HRIS concerns.

The model has nullable unique one-to-one links to `User` and `Technician`. The User link supplies a read-only profile-photo, application role, and OS access summary. Employee writes never mutate `User.status`, role, Auth identity, or login email. The Technician link exposes the existing current crew summary while all shifts, work orders, crew membership, and field status remain on the unchanged Technician graph. Existing records are not guessed or backfilled; reliable linkage is an explicit reconciliation task. Employment status and OS access status are independent.

`GET /api/v1/employees` returns only list-safe fields and excludes residential address, emergency contacts, and internal notes. `GET /api/v1/employees/:id`, `POST /api/v1/employees`, and `PATCH /api/v1/employees/:id` provide the approved detailed fields. The controller is protected with exact `ADMIN` role metadata in addition to the authenticated API guard. `/employees` repeats the ADMIN check during server rendering, provides search and employment-status filtering, and groups the edit form into Identity, Contact, Emergency Contact, Employment, Operations, OS Access, and Internal Notes. User Access mutations remain exclusively under Admin Settings → User Access. There is no delete endpoint; inactive records and operational history are retained.

## Controlled business inputs

Editable fields follow the classification and verified module matrix in [`CONTROLLED_INPUT_FIELD_AUDIT.md`](CONTROLLED_INPUT_FIELD_AUDIT.md): unique record values remain free text, lifecycle values use Prisma-backed fixed enums, entity references store canonical IDs, booleans and dates use native semantic controls, and reusable configurable classifications use managed business lists.

Phase 1 implements `BusinessListOption` for `JOB_TITLE` and `DEPARTMENT`; Phase 2 extends it with `PROPERTY_TYPE` options and a nullable Property relationship. Authenticated consumers list active options through `/api/v1/admin/business-lists`; ADMIN-only mutations create, rename, deactivate, and reactivate options; there is deliberately no delete endpoint. Employee records retain legacy `job_title` and `department` labels and add nullable typed foreign keys. An active, correctly typed option is required for a new controlled assignment, while inactive or legacy labels remain readable. Slice 5G bootstraps only the five website-approved Property Types described below; Job Titles, Departments, and custom Property Types remain administrator-managed.

### Customer and Property controlled inputs

Contact name is the required primary human-facing Customer field. The existing non-null `Customer.name` remains compatibility and legacy fallback data: the API derives it from Contact name for new records and explicit Contact name edits, while no historical backfill occurs. Display labels prefer Contact name, then legacy Name, then a safe generic label. Customer status is the existing fixed Prisma enum and is validated at the API boundary; customer-specific strings remain free text. Properties retain their canonical required Customer relation. A lean Customer selector response exposes only ID, customer name, and contact name. Property Type uses the shared managed-list model through a nullable foreign key: active correctly typed options may be assigned and inactive assigned options remain included for reading. The approved bootstrap does not rewrite historical data.

## Website-aligned Property Types and ADMIN customer cleanup

The initial managed `PROPERTY_TYPE` catalogue is aligned with the separately verified public website source `HestivaHQ/hestiva`, `src/routes/quote.tsx`: Apartment, Townhouse, House, Duplex, and Other. Migration `20260810230000_bootstrap_website_property_types` creates only approved labels missing under case- and whitespace-insensitive comparison. It never updates existing IDs or Property relationships, preserves custom and inactive options, and reports rather than reactivates an inactive approved option. “Not classified” is not canonical: a null relationship means no Property Type is selected. Active options remain the source for new selections, with inactive assignments readable historically. ADMIN management is canonical at `/admin/settings/business-lists` for Job Titles, Departments, and Property Types.

The separate `GET /api/v1/admin/customer-cleanup/:id/impact` and `DELETE /api/v1/admin/customer-cleanup/:id` contracts require an authenticated application User with the exact ADMIN role. The server derives the displayed confirmation name from trimmed `contactName`, falling back to legacy `name`, and requires an exact match on deletion. Preview counts are informational; deletion re-reads them inside one Prisma transaction.

The verified owned tree is Customer → Property and Customer/Property → WorkOrder → WorkOrderActivity, WorkOrderChecklistItem, WorkOrderPhoto metadata, and WorkOrderCustomerSignOff. Work-order-linked Shift rows are shared planning records, so cleanup sets only their `workOrderId` to null. It explicitly deletes owned children, Work Orders, Properties, and then the Customer. Users/owners/actors, Services, Employees, Technicians, Crews, Business Lists, Business Profile, Auth identities, and unrelated records are never deletion targets. Normal `DELETE /customers/:id` remains protected and returns 409 for linked Properties or operational history.

No safe Supabase Storage object-deletion service exists in this repository. Cleanup removes `WorkOrderPhoto` database metadata atomically but does not remove Storage objects; the response reports `storageObjectsDeleted: false` and flags possible orphaned Storage whenever photo rows were removed. Identifier-only server logging records actor User ID, Customer ID, counts, and timestamp, without Customer content. Persistent audit storage remains deferred under the existing architecture.

Customer Data Cleanup confirmation remains an exact, case-sensitive match against the authoritative Customer display name. A non-empty mismatch produces explicit text feedback, and the final destructive control stays disabled with a readable opaque muted treatment. This presentation change does not alter ADMIN authorization, preview, transaction, preservation, or Storage orphan-risk semantics.

## Accepted-quote Work Order ownership

A Work Order is the operational record for one accepted cleaning quote. Customer remains authoritative for identity and contact data; Property remains authoritative for the address, property type, and persistent access notes; Work Order owns visit-specific service, condition, timing, instructions, and assignment. The existing nullable `serviceId` is the primary-Service relationship: new assignments require an active `PRIMARY` Service, while historical inactive or null relationships remain readable. `WorkOrderAddOn` is the explicit zero-to-many join to canonical `ADD_ON` Services; only active add-ons may be newly attached, but deactivation does not erase or invalidate an existing relationship.

Nullable `WorkOrderFrequency` (`ONE_TIME`, `WEEKLY`, `EVERY_TWO_WEEKS`, `MONTHLY`, `CUSTOM`) and `HomeCondition` capture accepted-quote facts without fabricating values for historical rows. A short custom note is accepted only with `CUSTOM`; it is descriptive, not a recurrence rule. Recurring agreement identity/rules/status, job generation, next dates, pauses, cancellations, exceptions, and long-term preferences remain reserved for Slice 5L. Website handoff remains deferred to Slice 5M.

## Property operational profile (Slice 5J)

Property is the canonical live source for persistent home facts, access/logistics, household operational notes, and care/product restrictions. Nullable controlled `BedroomCount`, `BathroomCount`, `LivingAreaCount`, and `StoreyCount` values prevent free-text count drift. Nullable booleans distinguish an unknown historical answer from yes/no for estate/complex status, gate/security access, pets, and cameras. Concise nullable notes cover parking, pets, off-limits areas, fragile items, product restrictions, and operational allergy restrictions; `accessNotes` remains the single general access field. Province remains stored and API-compatible but dormant in normal Property forms.

Work Order continues to own the primary Service, Add-ons, frequency snapshot, visit condition, job-specific instructions, schedule, and assignment. Its office summary and Technician job view read the current related Property profile; no profile columns or historical snapshot are copied onto Work Order. A visit-specific exception belongs in Work Order instructions. Recurring-agreement rules remain future work.

Full Property and authorized Work Order responses can carry operational details. The generic `GET /properties/selector-options` contract explicitly selects only ID, customer ID, name, first address line, and city, excluding access, cameras, pets, allergies, and care notes. Existing authorization is unchanged. Technician presentation is limited to actionable access, parking, pet, off-limits, fragile-care, and product/allergy restriction information.

## Property quote vocabulary alignment (2026-08-10)

The authorized full Property resource stores nullable `floorSize`, `outdoorArea`, `estateClassification`, and unified `unitFloor` enums. `unitFloor` is validated against the managed Property Type label: Apartment and Townhouse have distinct allowed subsets; other types clear the value on type change. `STUDIO` is Apartment-only. The legacy `isEstateOrComplex` boolean and `THREE_PLUS` storey remain readable compatibility states and are not used for new exact selections. Generic Property selectors remain identity-only; Work Orders read the live full Property profile.

## Recurring service agreements (Slice 5L, 2026-08-11)

`Customer → Property → RecurringServiceAgreement → WorkOrder` is the ownership chain. The agreement owns structured cadence, lifecycle, canonical primary Service/add-ons, date range, preferred time window, recurring instructions, and inspectable `nextServiceDate`; Property continues to own access and household facts. Customer is derived through Property rather than duplicated.

Weekly rules select the next controlled weekday. Every-two-weeks rules use the first selected weekday on/after `effectiveDate` as a stable 14-day anchor. Monthly rules use day 1–31, clamped to the final valid day of short months. All business-date boundaries use `Africa/Johannesburg`; CUSTOM is prose-only and manual. An optional end date is inclusive.

Explicit generation creates at most one upcoming visit per ACTIVE standard agreement when no future occurrence already exists. It skips missed dates, uses the normal `WO-YYYYMMDD-####` transaction, and snapshots Service, add-ons, frequency, and instructions. `(recurringAgreementId, recurrenceDate)` is database-unique. Generated Work Orders are independent records: edits, pause, resume, cancel, or natural end do not rewrite/delete them. Assignment remains the existing Work Order concern.

### Local Supabase JWT verification

As of 2026-08-13 22:24 SAST, the NestJS API authentication boundary verifies Supabase access tokens locally rather than calling Supabase Auth `/auth/v1/user` for every protected API request.

The production Supabase project uses asymmetric ECC P-256 signing keys. The API therefore accepts ES256 bearer tokens and verifies their signatures cryptographically against Supabase's public JWKS endpoint.

Public JWKS data is cached in-process for ten minutes. If a token presents an unknown `kid`, the guard performs one forced JWKS refresh so a legitimate signing-key rotation can be discovered before normal cache expiry.

Local verification remains fail closed. A token must have:

- the `ES256` algorithm;
- a known signing-key identifier;
- a valid cryptographic signature;
- the expected Supabase Auth issuer;
- the `authenticated` audience;
- a non-empty subject;
- a valid expiry; and
- a valid optional `nbf` value, allowing only the configured narrow clock-skew tolerance.

Malformed, expired, incorrectly scoped, unsupported, unknown-key, or cryptographically unverifiable tokens are rejected.

This optimization changes only Supabase provider-token verification. HestivaOS application authorization remains separate and unchanged: after token verification, the global guard resolves the canonical application `User`, requires `ACTIVE` status, and applies route role metadata. The narrow `/users/sync` bootstrap exception remains available for a cryptographically authenticated Supabase identity that does not yet have an application User.

Supabase remains the authentication identity and signing-key authority. HestivaOS stores no Supabase private signing key for this mechanism.

See ADR-0034 for the durable architectural decision.

## Non-lossy accepted Quote operational context

Accepted Quote conversion retains the immutable accepted `QuoteRevision` as commercial authority and projects typed execution context in the same serializable acceptance transaction. Work Orders own preferred/alternative timing, flexibility, urgency, exact visit floor/building access, visit access/parking/key/presence instructions, eco-product preference, and explicitly customer-declared existing damage. Existing Property master data is never overwritten during acceptance. Recurring agreements own only stable recurring instructions, preferred time and eco-product preference; generated visits inherit those fields but not initial-visit access context.

Stored photos associated with the accepted revision are referenced through `WorkOrderQuoteEvidence`, separate from cleaner `WorkOrderPhoto` evidence. `WorkOrderTemporaryAccessCredential` is the visit-scoped boundary for codes and QR/document credentials, with validity, expiry, single-use and revocation metadata. Acceptance does not infer credentials from free text, and recurring generation never copies credential records.

## Work Order Technician assignment snapshots

A Work Order owns zero, one, or many explicit Technician assignments through `WorkOrderTechnician`. The composite Work Order/Technician key prevents duplicates and the Technician-leading index supports future assigned-job lookup. Zero assignments is the valid operational **Unassigned** state. The legacy nullable `technicianId` remains a first-assignment compatibility projection while historical values are migrated into the normalized join.

The canonical worker identity is the existing `Technician`; an optional linked `EmployeeRecord` contributes employment status but is not duplicated. ADMIN alone can change assignments. Newly selected Technicians must have active Technician status and, when linked, active Employee status. A selected active Crew prepopulates its currently active members, after which the explicit Work Order set is authoritative. Crew membership changes do not update historical or future saved assignment snapshots. Quote acceptance, recurring generation, and direct creation all create ordinary Work Orders and may remain unassigned. Cleaner job execution is not part of this foundation.

## Crew and Job leadership

An active Crew is a reusable staffing preset containing one or more active Technicians and exactly one member designated as Crew Leader. A one-person Crew appoints its member automatically. Crew Leader is an operational default, not the `SUPERVISOR` application role, and creates no additional authorization. A single Employee Record can link both an application User (including ADMIN or SUPERVISOR) and a Technician; only the explicit Technician link makes that employee assignable.

A staffed Work Order owns a nullable-at-rest `jobLeaderId` relationship to the canonical Technician. Current mutations require exactly one assigned Job Leader: a sole Technician is automatic, while Crew prepopulation defaults to the current Crew Leader. The saved value is a snapshot; Crew membership, leadership, and status changes never update existing Work Orders. Null remains valid for Unassigned Work Orders and unresolved historical multi-person assignments. ADMIN alone manages Crew and Work Order staffing/leadership. Leader changes create Work Order activity without rewriting history. Start Job and Complete Job now use this snapshot for field authority as described below. Reason-required active-job leadership transfer remains unimplemented; Supervisor-dependent launch workflows remain prohibited.

## Homent Technician B1 (implemented 2026-08-17)

`/technician` is a role-focused mobile PWA within the existing Next.js deployment. Its NestJS `/api/v1/technician/jobs` contract resolves the authenticated User through the active EmployeeRecord to the active canonical Technician, then applies normalized Work Order assignment predicates to list, detail, and Start Job operations; ADMIN never widens this field scope. DTO projections omit Customer/Quote/payment/commercial records and temporary access credentials. Today is the default, Upcoming is future work, Recent is the preceding 30-day assignment history, and the cache feed is Today plus two days.

Start Job reuses `WorkOrderStatus.ON_SITE`. Nullable `startedAt`, `startedByTechnicianId`, and unique nullable `startOperationId` preserve actual field start, canonical Technician attribution, and idempotency without changing scheduled time. Only the assigned `jobLeaderId` may start eligible `ASSIGNED`, `ACCEPTED`, or `TRAVELLING` work; a serializable optimistic transaction records one `JOB_STARTED` activity. IndexedDB schema v1 durably stores minimized job packages and queued starts, while launch/open/resume/connectivity opportunities reconcile without polling. The Technician-scoped manifest/service worker caches only the application shell; protected credentials and later execution functionality remain deferred.

## Homent Technician frozen Execution Scope

Homent Technician uses normalized `ServiceScopeTemplate` / immutable numbered version / template-section records to define execution standards separately from Quotes. ADMIN-authored Work Order Execution Scope revisions instantiate stable section IDs, frozen requirements, controlled grouping, additions and exclusions before work starts. Only Published template versions create normal revisions; retirement does not alter historical revisions. Existing Work Orders are deliberately left without scope rather than backfilled with unverifiable history.

Start Job atomically binds the latest applicable revision and rejects a stale cached revision. Assigned Technicians operate only the bound revision. Section outcome events are append-only and operation-idempotent; optimistic section versions prevent stale last-arrival-wins, while a current event pointer supports small Job Packages. `WorkOrder.jobLeaderId` authorizes cross-Technician correction and Review Job. Evidence policy and sync state are data, not UI constants. IndexedDB v2 durably caches the package and queues section operations; backend assignment checks remain authoritative and ADMIN alone grants no execution access.

## Homent Technician D evidence transport

Execution Evidence is a checklist-specific record bound to Work Order, frozen scope revision, section, authenticated Technician, purpose, stable client UUID, capture time, deterministic object path, and authoritative acknowledgement; it is not a `WorkOrderPhoto` BEFORE/AFTER category. `/technician` shares the legacy WebP compressor, persists metadata plus Blob in IndexedDB v3 before UI success, and reconciles uploads sequentially through the configured Supabase Work Order photo bucket. Object success is intermediate: the assignment-scoped API must idempotently acknowledge the evidence UUID before the local Blob becomes eligible for bounded cleanup. Outcome operations reference stable evidence UUIDs, so REQUIRED and ON_EXCEPTION work can progress from durable local capture without waiting for connectivity. See ADR-0046.

## Homent Technician E completion and acknowledgement

The canonical `/technician` completion authority is `POST /technician/jobs/:id/complete`, not the legacy Work Order status control. IndexedDB v4 extends the existing operation store with a UUID-identified `COMPLETE_JOB` record bound to Work Order, frozen scope, Job Leader, field time, expected state and local sync state. Local persistence makes execution read-only and may report **Completed · Sync pending** without changing the authoritative status. Server reconciliation repeats assignment, leadership, lifecycle, frozen-scope, outcome, exception and evidence-metadata checks; safely captured evidence may still be uploading. Acceptance is idempotent, changes `ON_SITE` or `WAITING_FOR_PARTS` to `COMPLETED`, and stores immutable completion attribution/times.

Completion correspondence is separately gated. ADMIN or SUPERVISOR acknowledgement stores actor/time and creates correspondence eligibility, but no delivery occurs in this slice. Technician completion alone never sends customer email, WhatsApp, Messenger or SMS. Conflicting offline operations remain on device for management review, and Technicians have no reopen operation. See ADR-0047.

## Provider-neutral Messaging Foundation v1 (2026-08-18)

HestivaOS owns the provider-neutral business boundary for future WhatsApp and Facebook Messenger integration. The foundation is contract-first: provider adapters may verify authenticity, normalize inbound provider events, preserve provider-scoped identity/referral provenance, and transport outbound messages, but they do not own Customer, Quote, pricing, booking, payment, Work Order, or recurring-service decisions. Provider event replay identity is deterministic and excludes canonical Customer or phone identity.

Messaging does not impersonate the Website integration, does not claim `HESTIVA_WEBSITE` provenance, and never reuses `HESTIVA_WEBSITE_INTEGRATION_SECRET`. Future channel adapters must converge on the existing authoritative Quote domain through a shared/internal Quote application-service boundary. The current foundation includes a channel-neutral Quote-draft contract and human-review lifecycle rules but does not expose a live Meta webhook, add provider credentials/environment variables, make Meta API calls, register a runtime messaging module, or add Prisma messaging persistence.

Persistence/privacy decisions approved through Issue #116 require normalized provider payloads rather than raw payload retention, immutable persisted message history, canonical Quote/retention ownership, and explicit human-review handling. Durable Conversation / Provider Identity / Message / Attribution / State persistence remains a later focused slice and must enforce provider-event idempotency at the database boundary. See ADR-0048 through ADR-0052 and `MESSAGING_FOUNDATION_V1.md`.

## Phase 3A Work Order access readiness (2026-08-18)

Work Order now owns controlled visit-specific `accessReadiness`, independently of `WorkOrderStatus`, stable Property access facts, and the existing visit-scoped temporary-credential boundary. Effective ADMIN/SUPERVISOR changes append actor-attributed `WorkOrderAccessReadinessEvent` records and a non-secret activity. Unresolved `REQUIRED_MISSING`, `NEEDS_REVIEW`, or `EXPIRED` states authoritatively produce one deterministic High-priority Operations attention condition; reconciliation self-resolves it when readiness or the operational lifecycle resolves. No readiness transition changes lifecycle, schedule, assignment, execution, or correspondence. API and attention projections do not select credential relations. See ADR-0058 and `WORK_ORDER_ACCESS_READINESS_V1.md`.

## Phase 3B protected temporary access credentials (2026-08-18)

`WorkOrderTemporaryAccessCredential` remains the single visit-scoped temporary-access store. ADMIN-only commands encrypt protected text with AES-256-GCM, register private Work-Order-scoped attachment evidence, preserve supplementary metadata, and append actor-attributed create/view/review/revoke/expiry events. Safe metadata and explicit audited reveal are separate projections. Accepted, rejected, expired, and revoked outcomes drive the existing Phase 3A readiness service model rather than introducing another readiness state or Needs Attention producer. Broad Work Order, Dashboard, Needs Attention, activity, analytics, recurrence, replacement, and Technician projections do not receive credential contents. See ADR-0059 and `WORK_ORDER_TEMPORARY_ACCESS_CREDENTIALS_V1.md`.

## Phase 3C access operations and escalation (2026-08-19)

The existing `WORK_ORDER_ACCESS_REQUIRED` Needs Attention condition now derives priority solely from time remaining to authoritative `WorkOrder.scheduledAt`: Normal beyond 24 hours, High from 24 hours through exactly 4 hours, and Critical below 4 hours or at/after the appointment. Reconciliation uses the existing unique condition, resolution/reopen lifecycle and serializable retry boundary; it appends `PRIORITY_CHANGED` activity when the derived priority changes and stores no timer/countdown state. `ARRANGED_ANOTHER_WAY` and `NOT_REQUIRED` resolve without credentials, while `RECEIVED` resolves only when safe Phase 3B metadata proves an accepted, unrevoked credential in its validity interval.

Assignment-scoped Technician job DTOs expose only canonical readiness plus a derived operational-resolution boolean. Credential metadata is selected only inside the API for usability derivation and stripped before response/cache projection; protected values and reveal paths remain ADMIN-only. Phase 3C performs no lifecycle, staffing, Execution Scope, Job Leader, correspondence, messaging, or Finance action. See ADR-0060 and `WORK_ORDER_ACCESS_OPERATIONS_V1.md`; Phase 3D remains deferred.

## Phase 3D human-triggered access recovery (2026-08-19)

The canonical provider-neutral messaging boundary now persists provider-scoped conversations, normalized immutable-direction messages, provider-event/outbound idempotency identities, and minimal visit-scoped access-recovery correlation. An ADMIN may send the bounded access request only through a configured Customer-linked conversation. Inbound responses remain messaging evidence, are correlated for review without interpretation, and enter operational credential storage only through an explicit ADMIN command that reuses Phase 3B encryption/private attachment handling and human review. Safe Work Order recovery projections contain delivery/review state but no message body, provider identity, protected value, or private path. The existing access alert, lifecycle, Technician authority, and Finance are unchanged. See ADR-0061 and `WORK_ORDER_ACCESS_RECOVERY_V1.md`.

## 2026-08-19 — Work Order field incidents v1

Phase 4A adds assignment-scoped, offline-idempotent Work Order Incident reports and append-only ADMIN/SUPERVISOR reviews. Incident evidence extends the existing Execution Evidence metadata/pipeline; unresolved reports are authoritative producers in the shared Needs Attention Management Review queue. Work Order completion, frozen scope, scope mismatch, interruption and replacement visits remain independent authoritative aggregates. See `WORK_ORDER_INCIDENTS_V1.md` and ADR-0062.
## Supervisor operational projection (Phase 4B)

The SUPERVISOR-only `GET /api/v1/supervisor/operations` boundary provides a secret-minimized read projection over existing Work Order execution relations; it creates no new operational state. `/supervisor/operations` combines that projection with the canonical Needs Attention API and deep-links to existing domain review surfaces. Evidence is summarized as counts/synchronization state, and temporary credentials, raw storage paths, recovery context, Finance, and unrelated private data are excluded. Mutation authority remains on the existing role-guarded domain endpoints. See `SUPERVISOR_OPERATIONS_V1.md` and ADR-0063.

## Private Execution Evidence reads (2026-08-19)

Execution Evidence metadata remains append-only and local-first, while object retrieval is now an explicit API authorization boundary. Broad Work Order, incident, scope-mismatch and Supervisor projections expose safe provenance/synchronization metadata or counts without raw Storage paths. ADMIN/SUPERVISOR and currently assigned active Technicians may request one acknowledged artifact; the API verifies its Work Order binding and returns a 60-second signed private-bucket URL. See `EXECUTION_EVIDENCE_SECURITY_V1.md` and ADR-0064.

## Technician completion correction (2026-08-19)

Post-completion factual correction is an append-only aggregate authorized only by ADMIN/SUPERVISOR for exact sections of the frozen Execution Scope and the original completing Technician. The Work Order remains `COMPLETED`; corrected results are newly linked outcome events. Authorization preserves the current completion acknowledgement. The first accepted correction snapshots and makes that acknowledgement non-current, and `RESUBMITTED` requires fresh use of the canonical completion acknowledgement. Existing IndexedDB operations provide offline retry and reviewable conflicts. No scheduling, staffing, scope, Finance, pricing, correspondence, notification, or messaging side effect exists. See `TECHNICIAN_COMPLETION_CORRECTION_V1.md` and ADR-0065.
