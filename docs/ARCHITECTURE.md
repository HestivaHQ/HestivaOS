# Production architecture

## Operational continuation, identity presentation, and controlled deletion

The shared authenticated `AppFrame` resolves `POST /users/sync` when its caller has not already supplied an application User. Desktop and mobile account presentations then receive that same authoritative `AppUser` and display its application role; neither presentation invents a Technician role while identity is unresolved. Supabase Auth remains the authentication identity authority and the application `User` remains the role and OS-access authority.

The primary navigation follows Dashboard → Customers → Properties → Work orders → Team → My profile. Team is an accessible disclosure containing Technicians, Crews, and Shift Planning in that order; desktop and mobile presentations use the same item source. Employee Records and canonical Service catalogue management belong to Admin Settings, so neither is promoted in primary operational navigation. The existing `/employees` authorization and `/services` authenticated read-only route remain unchanged.

Successful new Customer creation validates the returned persisted ID and uses a document navigation to `/properties?mode=create&customerId=…`; Customer edits do not continue to Property creation. Successful Property creation continues to `/work-orders?mode=create&customerId=…&propertyId=…`. The IDs are canonical persisted relationship IDs. Each receiving form verifies the requested record exists in its loaded authorized catalogue; Work Order preselection additionally verifies that the Property belongs to the Customer. Missing, unknown, or mismatched deep-link values produce a validation message and do not create a record. Work Order creation preserves this preselection and requires a canonical active Service selection.

Customer deletion is permanent only for a Customer with no Properties and no Work Orders. The service checks both relationships before invoking Prisma deletion: operational history or linked Properties return a controlled HTTP 409 response, preserving all related records and preventing the schema's Property cascade from being used as a product workflow. Unexpected faults retain normal server-error handling. This is the current narrow application of the product rule that expected domain rejection is not an internal server error.

Property Type remains the optional `PROPERTY_TYPE` Business List relationship. New assignment offers active options only; an empty catalogue displays an unassigned prompt rather than a fabricated “Not classified” taxonomy, while an inactive existing assignment remains readable during editing. Province remains a nullable database/API compatibility field and existing values remain readable wherever Property addresses are rendered, but ordinary Property create/edit forms omit it and do not overwrite stored Province values.

## Canonical service catalogue

Hestiva OS owns the operational service catalogue. `Service` has a minimal `PRIMARY`/`ADD_ON` classification, an active/inactive lifecycle, and a nullable unique normalized key used for safe case/whitespace comparison. Existing IDs and Cleaning Job Template relationships are preserved. Authenticated operational users may read the catalogue; only ADMIN may create, edit, deactivate, or reactivate records at `/admin/settings/services`. `/services` is an active, read-only operational catalogue. New template assignments reject inactive Services while existing templates continue to include and display inactive historical relationships.

The initial catalogue was reconciled from the supplied, verified `HestivaHQ/hestiva` sources `src/content/services.ts` and `src/lib/quote-options.ts`. The public-page name `Eco-Conscious Cleaning` is canonical and `Eco-Friendly Cleaning` is its recognized quote-form alias. The migration does not create `Multiple Services Required`, `Other (Please Describe)`, or the `Cleaning Add-On Services` landing/grouping page. Website synchronization is not live-coupled. Website subordinate `JOB_TYPES` were not imported; Cleaning Job Templates are the existing nearby operational structure, and an approved mapping remains future work rather than a duplicate model.

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
- **Database:** Supabase PostgreSQL is accessed by the API through Prisma. Prisma migrations run before API process startup.
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

The authenticated Admin dashboard is a daily command centre rendered as a Next.js Server Component inside the shared `AppFrame`; client boundaries are limited to the reusable disclosure control and the shared shell's responsive mobile navigation. At widths up to 900px, `AppFrame` replaces its unchanged desktop sidebar with a compact header and an initially closed drawer built from the same navigation-link source. Its fixed dashboard hierarchy is header, four shortcuts, today's schedule, actionable alerts, today's current workload, and seven-day upcoming work. Analytics, technician workload, recent activity, and a separate overdue section remain available in backend compatibility fields but are not dashboard presentations.
The authenticated Admin dashboard is a daily command centre rendered as a Next.js Server Component inside the shared `AppFrame`; only the reusable disclosure control is a Client Component. Its fixed hierarchy is header, four shortcuts, today's schedule, actionable alerts, today's current workload, and seven-day upcoming work. Analytics, technician workload, recent activity, and a separate overdue section remain available in backend compatibility fields but are not dashboard presentations.

`GET /api/v1/dashboard` retains its existing response and adds `operationalDashboard`. The additive field supplies an Africa/Johannesburg operational date, a today-only status breakdown, real unassigned and overdue conditions, and date-grouped totals for the next seven calendar days excluding today. Dashboard date boundaries are calculated independently of the API host timezone. Current Workload excludes `CLOSED`, `CANCELLED`, and the legacy `WAITING_FOR_PARTS` presentation. Upcoming Work treats every calendar day equally.

`WorkOrder.reference` is a nullable, database-unique permanent identifier for additive historical compatibility. New records receive `WO-YYYYMMDD-####` server-side from the Africa/Johannesburg creation day and an atomic daily counter inside the creation transaction; the sequence is capped at 9999. `serviceId` is nullable for history but a canonical active Service is required for new work. The non-null legacy `title` remains preserved and is populated with the reference for new rows. UI labels derive Service, Customer display name, and Property label, then fall back to legacy title. References never encode PII and are not changed by later scheduling or relationship edits. Property address fields provide the compact location, and assignment prefers a crew, then a technician, then a prominent unassigned state. Worker Issue and Job Exception alerts are not emitted because corresponding functional models do not yet exist.

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
