# Changelog

## 2026-08-18 — Dashboard Needs Attention Foundation v1

### Added

- Added durable `AttentionItem` / `AttentionItemActivity` persistence with stable condition identity, deterministic priority, permission-aware queues/owners, Mine / All, Seen state, audited reassignment, automatic resolution and reopen history.
- Added the protected `/api/v1/attention` read/Seen/assignment boundary and a responsive Dashboard Needs Attention panel with direct Work Order resolution links.
- Added authoritative initial producers for today-unassigned Work Orders, overdue unresolved Work Orders, and Technician-completed Work Orders awaiting management acknowledgement.
- Changed the Dashboard hierarchy to Needs Attention → Today’s Work → Shortcuts → Upcoming while retaining the existing Dashboard response as compatibility/current-work context.

### Preserved and deferred

- No Finance, Correspondence, Access, Messaging-human-review, Worker Issue, or Job Exception attention records are fabricated without authoritative runtime state.
- Snooze/delegation, active notification delivery, automated shift handover, and AI/opaque prioritization remain deferred.
- No environment variable, hosting, deployment-authority, authentication-identity, pricing, Quote, Customer, Property, or Technician execution contract changed.

## 2026-08-18 — Provider-neutral Messaging Foundation v1

### Added

- Added provider-neutral WhatsApp/Messenger contracts, provider adapter boundary, deterministic provider-event idempotency, and a channel-neutral Quote-draft/human-review contract.
- Added ADR-0048 through ADR-0052 covering provider-neutral ownership, canonical Quote/retention reuse, normalized provider payload persistence, immutable messaging history, and Messaging Quote lifecycle/human review.
- Added `MESSAGING_FOUNDATION_V1.md` as the focused foundation contract and synchronized architecture/rationale/roadmap documentation.

### Preserved and deferred

- No live Meta webhook, Meta credential/environment variable, provider API call, Prisma messaging model/migration, AI provider, customer-facing chatbot, Website integration change, pricing change, or operational source-of-truth change is introduced.
- Durable channel-neutral Conversation / Provider Identity / Message / Attribution / State persistence remains the next Messaging slice and must retain database-enforced provider-event idempotency and approved privacy boundaries.

## 2026-08-17 — Work Order Technician / Crew assignment

### Added

- Added normalized zero/one/many Technician assignments with database duplicate prevention, legacy assignment backfill, ADMIN-only mutation, eligibility validation, and assignment activity.
- Added searchable multi-selection, Crew active-member prepopulation, job-specific adjustment, and clear Assigned/Unassigned list and detail presentation.

### Preserved and deferred

- Saved Work Order assignments are snapshots independent of later Crew membership. Quote acceptance, Website ingestion/pricing/idempotency/authentication, recurring generation, and Customer/Property resolution are unchanged. Cleaner job execution, dispatch optimization, recurring staffing templates, and new notification infrastructure remain deferred.

## 2026-08-16 — ADMIN Quote review UI

### Added

- Added ADMIN-only Quotes navigation, a responsive actionable queue, and progressive Quote detail review with authoritative preflight blockers.
- Added revision-bound Customer/Property resolution, immutable pricing and add-on quantities, operational handoff preview, distinct customer Quote evidence, readable activity, deliberate Accept/Decline confirmation, uncertain-result recovery reads, and direct accepted Work Order/agreement links.
- Added focused UI and read-model coverage; commercial calculations continue to come only from immutable Quote revisions.

### Preserved and deferred

- Backend decision authorization and atomic conversion remain authoritative. Website ingestion, authentication, contracts, pricing, profitability, and replay/idempotency are unchanged, and no Prisma schema or migration changed.
- Temporary credential secret management, cleaner presentation, WhatsApp/extraction workflows, and incident/checklist scope remain deferred.

## 2026-08-16 — Atomic recurring Quote acceptance

### Added

- Extended the ADMIN Quote Accept transaction to dispatch canonical `WEEKLY`, `EVERY_TWO_WEEKS`, `MONTHLY`, and `CUSTOM` Quotes into exactly one recurring agreement and one linked initial Work Order.
- Preserved exact generic, Laundry, and Ironing quantities across both operational records, with accepted-revision linkage, audit metadata, conditional transition, serializable retries, and complete-result recovery.

### Preserved and deferred

- ONE_TIME conversion and Website ingestion/authentication/contracts/replay/pricing are unchanged. Review UI and remaining non-lossy source-field handoff remain planned; Issue #79 remains historically closed.

## 2026-08-16 — Atomic ONE_TIME Quote acceptance

### Added

- Added protected ADMIN `PATCH /api/v1/quotes/:id/accept` with expected-revision protection, fail-closed readiness validation, exact accepted-revision identity, atomic Customer/Property resolution, one linked Work Order, exact Laundry/Ironing and other add-on quantities, and Quote/Work Order activity.
- Added serializable conflict retries, identical accepted-result recovery, conditional transition and database linkage/accepted-shape constraints.

### Preserved and deferred

- Recurring Quote conversion and `RecurringServiceAgreement` creation remain unimplemented. Exact floor, access/time-window/photo/commercial snapshot and other non-lossy projections remain on the immutable accepted revision for later work.
- Website ingestion/authentication/contracts/replay/pricing/profitability and direct Work Order/recurring-service behavior are unchanged. Issue #79 remains historically closed.

## 2026-08-15 — Quote Customer/Property match-or-review

### Added

- ADMIN Quote Customer/Property match-or-review results and durable `USE_EXISTING`/`CREATE_NEW` decisions.
- Audited, revision-bound, idempotent resolution persistence and additive database constraints.

### Not included

- Quote acceptance, Customer/Property creation, Work Order or Recurring Service Agreement creation, automatic merge, and Website ingestion changes.

## 2026-08-15 — Internal Quote review and decision foundation

### Added

- Added ADMIN-only internal Quote list/detail and non-mutating readiness preflight endpoints.
- Added terminal, expected-revision-protected Quote Decline with atomic status/activity auditing and safe identical retry behavior.
- Added durable accepted-revision identity plus unique restricted future Work Order and recurring-agreement links.

### Preserved

- Quote Accept conversion remains unavailable; this change creates no Customer, Property, Work Order or Recurring Service Agreement records and never sets `ACCEPTED`.
- Guarded Website ingestion, authentication, v1/v2 validation, replay/idempotency, pricing/profitability, OpenRouteService costing and Laundry/Ironing behavior are unchanged.

## 2026-08-15 — Website Quote review-required intake correction

### Fixed

- Valid authenticated Website Quote submissions no longer fail with HTTP 503 solely because an authoritative operational-cost component cannot yet be resolved from the submitted facts. HestivaOS now persists those requests atomically as `NEEDS_ATTENTION`, returns the authoritative `Q-...` reference, and records unresolved cost/provenance details for Admin review.
- Contract v2 no longer applies the historical Apartment/Townhouse exact-floor rule to Townhouses. Apartments continue to require exact floor and building access; Townhouses v2 use storeys and can omit apartment-style floor/elevator data.
- Added regression coverage for review-required Quote persistence and corrected Townhouse Contract v2 validation.

### Preserved

- Bearer-secret authentication, contract validation, immutable replay/conflict handling, HestivaOS pricing authority, serializable persistence, Quote-reference generation, and fail-closed handling of genuine trust/data/persistence failures remain intact.
- Incomplete cost facts are not guessed or silently treated as zero, and a `NEEDS_ATTENTION` Quote is not a final profitability-protected customer price or an accepted operational booking.
- Historical Contract v1 validation remains unchanged for backward compatibility; the live Website uses Contract v2.

## 2026-08-14 — UI/UX speed pass 2G

### Changed

- Narrowed the three live dashboard Work Order queries to explicit fields the current command-centre actually uses instead of returning broad related records.
- Today's rows retain only the rendered identity, status, schedule, assignment, customer, address, service, technician, and crew fields. Upcoming rows now carry only schedule and assignment IDs; overdue rows carry only IDs required for the count.
- Kept the legacy top-level upcoming and overdue arrays present as empty compatibility fields rather than duplicating records the current dashboard does not consume.

### Preserved

- Preserved the three-query dashboard boundary, Africa/Johannesburg date semantics, workload and assignment rules, visible UI behavior, route, authentication, authorization, Prisma schema, migrations, and deployment configuration.
- Removal of the remaining legacy zero/empty outer analytics fields remains a separate contract-cleanup task.

## 2026-08-14 — UI/UX speed pass 2F

### Changed

- Unified Admin Settings → Business Lists with the authenticated server API wrapper. The page no longer performs its own Supabase session read or manually passes `session.access_token` into the Business Lists API call.
- Added Business Lists access to `createAuthenticatedApi()` so the existing authenticated server session/token is reused.

### Preserved

- Supabase remains the identity authority. Existing ADMIN authorization, application-user synchronization, ACTIVE-status enforcement, API JWT verification, fail-closed behavior, API contracts, Prisma schema, migrations, business behavior, and deployment configuration remain unchanged.

## 2026-08-14 — UI/UX speed pass 2E

### Changed

- Removed redundant page-level Supabase `auth.getUser()` calls from Technicians, Crews, Shift Planning, Work Order detail, Admin Settings, Employee Records, Admin Services, User Access, Business Profile, and Customer Data Cleanup. These pages now use the authoritative HestivaOS application User for shell identity while preserving their existing role checks.
- Left Business Lists unchanged because it currently consumes the Supabase session access token directly for its API request; refactoring that path is separate work.

### Preserved

- Supabase remains the identity authority. Protected-route middleware, authenticated API token acquisition, local API JWT verification, HestivaOS application-user synchronization, ACTIVE-status enforcement, ADMIN/role authorization, and fail-closed behavior remain unchanged.
- No API contract, Prisma schema, migration, business workflow, deployment setting, dependency, or production configuration changed.

## 2026-08-14 — UI/UX speed pass 2D

### Changed

- Removed redundant page-level Supabase Auth reads from Profile, Services, and Cleaning Job Templates. Each page now resolves the authoritative HestivaOS application User once through the authenticated API and passes that same User to the shared application frame.
- Profile no longer performs separate `auth.getUser()` and `auth.getSession()` calls before application-user synchronization; the authoritative application User email remains the read-only authenticated email shown by the page.

### Preserved

- Supabase remains the identity authority. Protected-route middleware, authenticated API token acquisition, local API JWT verification, application-user synchronization and ACTIVE-status enforcement, role authorization, and fail-closed behavior remain unchanged.
- No API contract, Prisma schema, migration, business workflow, deployment setting, dependency, or production configuration changed.

## 2026-08-14 — Dashboard operational query slimming

### Changed

- Switched the live Admin dashboard to a focused operational service through the existing `DashboardService` injection token, preserving the `/dashboard` controller and route contract.
- Reduced the live dashboard database workload from 21 transaction operations to three Work Order list queries covering today's schedule, the next seven calendar days, and actionable overdue work. Current workload, assignment and upcoming summaries are derived in memory.
- Retained the unused legacy analytics response fields as zero/empty compatibility placeholders so their former historical, technician and activity queries no longer run on ordinary dashboard loads.

### Preserved

- Preserved Africa/Johannesburg business-day boundaries, workload status exclusions, crew-or-technician assignment semantics, authentication and authorization, Prisma schema and migrations, deployment configuration, and the existing web-facing dashboard response shape.

### Known issues

- The legacy analytics response fields and original non-live `DashboardService` remain temporary compatibility/reference debt; a later focused contract cleanup may remove them after confirming no consumers require them.

## 2026-08-14 — UI/UX speed pass 2A

### Changed

- Removed redundant page-level Supabase `auth.getUser()` verification from Dashboard, Customers, Properties, Work Orders, and Recurring Services. These routes now use the already synchronized authoritative HestivaOS application User for shell identity/email after protected-route middleware verification.
- Removed the immediate `router.refresh()` after successful login navigation; `router.replace()` remains the single post-authentication navigation action.

### Preserved

- Supabase remains the identity authority. Protected-route middleware authentication, API JWT verification, HestivaOS application-user synchronization, ACTIVE-status enforcement, role authorization, and fail-closed behavior remain unchanged.
- No API contract, database schema, migration, business workflow, deployment setting, or production configuration changed.

### Known issues

- Lower-frequency protected pages still contain duplicate page-level Supabase user verification and remain follow-up work.
- The dashboard API still computes substantial legacy totals, metrics, technician workload, activity, and list data not rendered by the current daily command-centre UI; query slimming remains the next high-impact performance target.

## 2026-08-14 — Reliable GitHub connector workflow

### Changed

- Adopted READ → VERIFY → WRITE → VERIFY → PR as the repository-default connector operating sequence.
- Required exact target-branch file reads and current blob SHAs before replacement, serialized dependent writes, and post-write state verification before dependent work proceeds.
- Required a GitHub state re-read after blocked, failed, or timed-out connector operations before any corrected retry; low-level Git APIs are not a default bypass for a blocked normal action.
- Kept CI corrections on the existing scoped branch, required exact-head verification after fixes, and prohibited merging red or still-running required gates.
- Changed routine documentation batching from approximately 3–5 decisions to a maximum of approximately 15 substantive approved decisions while preserving earlier synchronization for major architecture, security, legal/compliance, infrastructure, payment and cross-system changes.

### Preserved

- No runtime application code, API contract, database schema, deployment setting, authentication behavior, financial policy, or production environment was changed by this repository-workflow update.

## 2026-08-11 — Slice 5M website Quote replay resolution

### Added

- Added database-aware Website → HestivaOS Quote replay classification using the durable unique `Quote.submissionKey` identity and the merged canonical payload fingerprint.
- Added explicit `NEW`, `REPLAY`, `CONFLICT`, and fail-closed `CORRUPT_EXISTING` outcomes, with replay comparison anchored to exactly one immutable original `CUSTOMER_SUBMISSION` revision so later Admin revisions cannot invalidate a legitimate website retry.
- Added focused Jest coverage for unseen submissions, identical retries, conflicting material, missing/duplicate original submission revisions, and identical retries after an Admin revision.

### Preserved

- No ingestion controller is exposed, no Quote or operational record is created, no pricing/photo/customer/property handoff runs, and no deployment configuration changes in this prerequisite sub-slice. Database uniqueness remains the final concurrency boundary for later atomic ingestion.

## 2026-08-11 — Slice 5M runtime security and idempotency prerequisites

### Added

- Added fail-closed API-side verification for the approved Website → HestivaOS bearer-secret boundary using a fixed-length SHA-256 digest comparison before Node's constant-time equality primitive.
- Added deterministic SHA-256 fingerprinting for complete structured website Quote submissions, recursively sorting object keys while preserving array order so retries can distinguish identical material from conflicting reuse of the same submission identity.
- Added focused Jest coverage for exact/malformed bearer credentials, missing configuration, prefix/suffix rejection, key-order stability, material payload changes, array-order preservation, and fingerprint comparison.

### Preserved

- No ingestion controller is exposed, no integration secret value or deployment configuration is added, no fingerprint is persisted, and no Quote, pricing, photo, Customer, Property, Work Order, or recurring-agreement record is created by this prerequisite-only sub-slice.

## 2026-08-11 — Slice 5M-B website Quote contract v1

### Added

- Added the versioned `1.0` structured Website Quote Submission contract, typed validation boundary, authoritative pricing-response shape, stable submission/photo retry identities, exact-floor/access transport, quantity-aware approved add-on semantics, and focused API tests.
- Added the server-to-server route/authentication contract and ADR-0028 without exposing an incomplete ingestion endpoint or committing any integration credential.
- Added `WEBSITE_QUOTE_CONTRACT_V1.md` as the consumer contract and reconciled the earlier Slice 5K mapping so resolved 5M decisions no longer appear as current unresolved blockers.

### Preserved

- Existing Quote persistence, Customer/Property/Work Order/Recurring Agreement behavior, production website submission, pricing calculation, storage, and deployment configuration remain unchanged in this contract-only sub-slice. Exact-floor persistence, photo-hash persistence/storage reconciliation, authoritative pricing calculation, authenticated ingestion, and accepted-Quote operational handoff remain later 5M implementation work.

## 2026-08-11 — Slice 5M-A authoritative Quote domain foundation

### Added

- Added the authoritative HestivaOS Quote aggregate with stable public reference, commercial lifecycle, 30-day validity boundary, immutable revision snapshots, structured pricing line items, durable quote-photo provenance/transfer state, append-only quote activities, and an atomic daily reference counter foundation.
- Added an additive Prisma migration and focused source-contract tests for the new Quote domain.
- Added ADR-0027 documenting HestivaOS ownership of quote identity/history/pricing snapshots while keeping website transport, pricing calculation, Accept/Decline security, and accepted-quote operational orchestration in later Slice 5M sub-slices.

### Preserved

- Existing Customer, Property, Work Order, recurring-agreement, website, authentication, deployment, and storage behavior is unchanged by this foundation. No historical rows are backfilled or rewritten.

## 2026-08-10 — Slice 5I-A Work Order add-on UI polish

- Restyled Work Order add-ons as cohesive, full-row native checkbox choices in a responsive one- or two-column layout, with visible selected, focus, hover, and inactive-historical states.
- Replaced implementation-oriented supporting copy and the empty-catalogue wording with natural user-facing messages while preserving active `ADD_ON` filtering and existing selection submission.
- Changed no Work Order business/data behavior, API, Prisma model, service catalogue, scheduling, or Technician/Crew assignment behavior. The assignment redesign remains deferred to Slice 5N.

## 2026-08-10 — Product Slice 5E — Operational flow and role synchronization

- Converted Customer relationship-protection failures into controlled HTTP 409 conflicts before deletion. Customers without Properties or Work Orders remain deletable; linked Properties and Work Order history are preserved without cascade deletion or raw Prisma errors.
- Added safe frontend denial wording and separated expected denial/validation from generic unexpected-failure presentation.
- Made the shared shell synchronize an authoritative application User whenever the route has not already supplied one. Desktop and mobile account UI now consume the same User role and no longer default an unresolved identity to Technician.
- Continued successful Customer creation into Property creation and successful Property creation into Work Order creation using validated canonical Customer and Property IDs.
- Changed the Property Type null prompt from “Not classified” to a neutral selection state, retained active `PROPERTY_TYPE` Business Lists as the assignment authority and inactive historical readability, and added an empty-catalogue configuration signpost.
- Made Province dormant in ordinary Property create/edit UI without changing the Prisma/API field or overwriting stored values.
- Reordered shared navigation to Dashboard, Customers, Properties, Work orders, then workforce destinations; removed Services from primary navigation while preserving `/services`, Service APIs, operational lookup, and Admin Settings → Services.

## 2026-08-10 — Product Slice 5D — Canonical service catalogue

### Added

- Reconciled 11 primary services, Laundry Folding as one add-on record, and six canonical visual add-ons from the supplied `HestivaHQ/hestiva` catalogue sources.
- Added ADMIN-only service search, creation, editing, deactivation, and reactivation at `/admin/settings/services`, plus primary/add-on classification and normalized duplicate protection.

### Changed

- Hestiva OS is now the canonical operational catalogue. `/services` is an active read-only catalogue; inactive records remain readable through historical relationships.
- `Eco-Conscious Cleaning` is canonical and `Eco-Friendly Cleaning` is a recognized alias. Existing IDs and relationships are preserved by additive reconciliation.

### Deferred

- Public website synchronization and approved website job-type to Cleaning Job Template mapping remain separate work. Quote pseudo-options and the add-on landing page were intentionally excluded.

## 2026-08-10 — Product Slice 5C — Customer and Property controlled inputs

### Added

- Extended the existing managed Business Lists architecture with unseeded Property Types and an additive nullable Property relationship.
- Added lean searchable Customer selector labels and focused Customer, Property, Business Lists, authorization, compatibility, and validation coverage.

### Changed

- Property creation and editing now use validated canonical Customer IDs and active typed Property Type options. Existing inactive assignments remain readable; unique customer, address, access, and notes values remain free text.

### Preserved

- No Customer or Property records, addresses, ownership links, or historical strings are rewritten or deleted by the migration.

## 2026-08-10 — Product Slice 5B Phase 1 — Controlled field inputs

### Added

- Audited 109 editable fields across all current form modules and adopted the eight-class controlled-input standard.
- Added ADMIN-managed Job Title and Department business lists with active/inactive lifecycle, canonical Employee foreign keys, and backend validation.

### Changed

- Employee job title and department now select active managed options. Existing string values remain readable and are never automatically normalized; personal fields remain free text.

### Deferred

- Customer/Property, Work Order/Scheduling, and remaining evidence-backed improvements are separate phases.

## 2026-08-10 — Employee Records CORS preflight correction

### Fixed

- Normalized whitespace and trailing slashes in the existing explicit `CORS_ALLOWED_ORIGINS` allowlist so the browser's exact Cloudflare `Origin` can receive an allow-origin response. The API now explicitly advertises its existing HTTP methods and the `Authorization` and `Content-Type` request headers used by authenticated JSON requests; credentials and origin restrictions remain enabled.
- Added focused API policy coverage for Employee Records GET/POST/PATCH preflights, required headers, normalized approved origins, and rejection of arbitrary origins, plus web coverage confirming Employee Records continues through the shared bearer-token API helper.

## 2026-08-10 — Business Profile button labels

### Fixed

- Restored readable white labels on the filled Business Profile Save and Copy selected details buttons without changing their actions or the adjacent sharing controls.

## 2026-08-09 — Product Implementation Slice 4 — Business Profile

### Added

- Added the ADMIN-only `/admin/settings/business-profile` page, three information groups, persisted per-field share selections, five-field completeness indicator, and native WhatsApp, email, and clipboard sharing.
- Added the singleton `BusinessProfile` Prisma model, focused migration, narrow ADMIN read/update API, validated allowlisted input, and formatter, completeness, persistence, authorization-metadata, validation, and safe-logging tests.

### Security

- Banking and compliance sharing defaults off. API responses omit database identifiers/timestamps, mutation logs contain actor and changed field names only, and no credential or secret fields exist.

### Known issues

- Persistent product audit history and future management view/share permission groups are deferred. Quotations, invoices, email sending, and generated-document integrations are not part of this slice.

## 2026-08-09 — Product Implementation Slice 3 — User Access Management

### Added

- Added the ADMIN-only `/admin/settings/user-access` experience with a responsive user list, name/email search, role and OS-access filters, confirmed role changes, and confirmed access disablement.
- Added narrow ADMIN list, role, and access endpoints plus focused authorization, role, access, self-safety, last-admin, serialization-boundary, disabled-session, and auth-reconciliation coverage.

### Changed

- Defined existing `User.status` as Hestiva OS access while retaining separate `Technician.status` workforce semantics. All non-health API routes now authenticate and fail closed for missing or disabled application users.
- Serialized ADMIN-removing changes with a PostgreSQL transaction advisory lock and serializable transaction; self-demotion/self-disable are also prohibited.

### Security

- Disabled users are rejected on their next Hestiva API request and signed out during web bootstrap. Provider-wide Supabase session revocation is not implemented; no service-role credential is present or exposed. Verified-email stale-identity reconciliation remains unchanged.

### Known issues

- Last authenticated activity is unavailable. Permanent deletion, account creation/invitations, provider session revocation, and persistent administration audit history are deferred. Business Profile remains Slice 4 and Employee Records remains Slice 5.

## 2026-08-09 — Auth identity recovery and login resilience

### Fixed

- Replaced UUID-only application-user bootstrap with verified-email reconciliation for a single stale Supabase Auth association, preserving the existing application user ID, role, profile, and operational references.
- Converted unverified, ambiguous, conflicting, and concurrent uniqueness states into controlled fail-closed responses with safe identifier-only diagnostics instead of an unexplained database-backed HTTP 500.
- Added an immediate `Signing in…` state, synchronous duplicate-submit guard, disabled submit control, safe authentication failure messages, and reliable loading-state restoration to login.

### Security

- Required Supabase `email_confirmed_at` before a new Auth UUID can claim an existing application user by normalized email. Signup confirmation continues to use the active Hestiva OS origin; Supabase Dashboard Site URL and redirect allow-list remain deployment configuration.

### Known issues

- Administrative account recovery, access management, role assignment, revocation, and the broader employee/account lifecycle remain deferred to Product Slice 3.

## 2026-08-09 — Product Implementation Slice 2 — Profile & Admin Settings Foundation

### Added

- Added a compact accessible account menu for desktop and mobile with My Profile, ADMIN-only Admin Settings, and sign out actions.
- Added an ADMIN-protected `/admin/settings` gateway representing the deferred User Access (Slice 3) and Business Profile (Slice 4) modules without implementing their controls or data.
- Added a My Profile Security section that changes passwords through Supabase Auth; authenticated email is displayed read-only.

### Changed

- Restricted personal-profile editing and `PATCH /users/me/profile` to first name, last name, display name, phone number, and profile photo URL. Role, job title, and department remain stored for future access and Employee Records work but are no longer self-editable.

### Security

- Enforced Admin Settings authorization from the server-rendered route against the synchronized application User role; only `ADMIN` is accepted. Supabase Auth remains credential authority and no password is stored in the application database.

### Known issues

- Verified email-change UX, User Access Management, Business Profile, and Employee Records remain deferred to Slices 3, 4, and 5 as applicable.

Notable engineering and operational changes are recorded manually here. Add new entries in reverse chronological order under a `YYYY-MM-DD` heading, grouped as Added, Changed, Fixed, Removed, Security, or Known issues as appropriate.

## 2026-08-09 — Slice 1A mobile AppFrame navigation correction

### Fixed

- Replaced the permanently expanded narrow-screen AppFrame navigation block with a compact mobile header and an accessible, initially closed drawer sourced from the existing navigation links.
- Preserved the approved desktop sidebar and dashboard layout, account identity and role presentation, profile access, sign out, routes, and information architecture.

## 2026-08-09 — Product Implementation Slice 1 — Admin Dashboard Foundation

### Added

- Added accessible collapsible operational sections, a personalized Johannesburg-time header with profile avatar fallback, an explicit today-only workload contract, actionable alert details, and grouped next-seven-calendar-day summaries.
- Added focused tests for South African day boundaries, workload status exclusions, and upcoming assignment/date grouping.

### Changed

- Consolidated the Admin dashboard onto the shared `AppFrame` and focused its presentation on daily operations: exactly four shortcuts, today's chronological schedule, actionable alerts, current workload, and compact upcoming work.
- Changed dashboard date calculations from UTC calendar boundaries to Africa/Johannesburg business-day boundaries while retaining the broader legacy response fields for compatibility.

### Removed

- Removed visible dashboard presentations for technician workload, a dedicated overdue section, recent activity, statistics, performance metrics, waiting-for-parts, high-priority informational alerts, and maintenance-specific copy. No underlying enum, schema, migration, or business data was removed.

### Known issues

- Worker Issue, Job Exception, a direct WorkOrder-to-Service relationship, direct-create routing, the Management landing page, complete Admin Settings, Business Profile, Employee Records, Supervisor experiences, and repository-wide legacy cleanup remain future focused work.

## 2026-08-08 — OpenNext monorepo validation path

### Fixed

- Corrected both temporary validation paths to invoke OpenNext from the web workspace, where the existing `open-next.config.ts`, Next.js configuration, and Worker build output belong.
- Preserved the existing OpenNext configuration and all checked-in Wrangler settings; no credential, dependency, application, environment, or deployment change was made.

## 2026-08-08 — Next.js 16 pull-request validation

### Changed

- Temporarily extended the existing Node.js 24 pull-request quality gate after its independent web build with Cloudflare type generation, an OpenNext Worker build, and a Wrangler bundle dry run.
- Kept the existing checks unchanged and added no Cloudflare credentials or deployment capability; the Wrangler command requires `--dry-run` and each added validation fails the quality-gate job on failure.

## 2026-08-08 — Next.js 16 manual validation workflow

### Added

- Added a temporary, manually dispatched Node.js 24 workflow that validates the committed Next.js 16 migration through locked installation, Prisma bootstrap, root and workspace checks, OpenNext, Cloudflare type generation, a Wrangler dry run, and repository documentation/security checks.
- Added a successful-run job summary and an explicit reminder that authenticated runtime route testing remains a separate post-build smoke test.

### Security

- Limited the workflow to read-only repository permission, no production credentials, no automatic trigger, and no deployment. Dependency remediation remains pending the separate authoritative security audit.

## 2026-08-08 — Next.js 16 security migration

### Security

- Migrated the web workspace from Next.js 15.5.21 to stable Next.js 16.3.0. Normal Next.js dependency resolution moved PostCSS 8.4.31 to 8.5.23 and the Next-owned Sharp path from 0.34.5 to 0.35.3 without direct pins, overrides, or unrelated framework upgrades.

### Changed

- Retained the existing Supabase authentication middleware because its cookie handling is compatible, while recording Next.js 16's middleware-to-proxy deprecation as follow-up.
- Kept Next.js 16's default Turbopack build strategy. No webpack compatibility flag, Worker configuration change, deployment-authority change, or production deployment was introduced.

### Known issues

- This environment returned HTTP 403 for the PostCSS tarball during `npm ci`, both npm advisory requests, and later npx fallback requests. Consequently Prisma generation, compiled validation, OpenNext/Cloudflare validation, and application route regression testing could not run locally and remain required in GitHub on Node.js 24.
- Dependency remediation is not marked complete. The authoritative GitHub dependency-security diagnostic must confirm the target counts.

## 2026-08-08 — Dependency Security Remediation PR 2

### Security

- Updated the web workspace's Wrangler range from `^4.113.0` to `^4.120.0`, resolving Wrangler 4.120.0 and its supported Cloudflare toolchain: Miniflare 5.20260801.1-alpha, Undici 7.29.0, Miniflare-owned Sharp 0.35.2, and Workerd 1.20260801.1.
- Left Next.js, PostCSS, OpenNext, and the Next-owned Sharp 0.34.5 path unchanged. Added no npm overrides and no direct Miniflare, Undici, Sharp, or Workerd dependency.

### Changed

- Validated the unchanged Worker configuration and generated OpenNext Worker with Wrangler 4.120.0. The Worker identity, entry point, assets, compatibility settings, `keep_vars`, repository-owned `API_URL`, observability, build-variable validation, and Cloudflare native Git deployment authority remain unchanged; no deployment was performed.

### Known issues

- The npm advisory endpoint returned HTTP 403 for both requested local audits, so no after-remediation vulnerability counts are recorded. The authoritative GitHub Actions audit remains pending.
- Overall dependency remediation is not complete. Next.js, PostCSS, and the remaining Next-owned Sharp path still require separate remediation.

## 2026-08-08 — Dependency Security Remediation PR 1

### Security

- Refreshed only the authorized transitive lockfile resolutions: `brace-expansion` 1.1.16 → 1.1.18, 2.1.2 → 2.1.4, and 5.0.7 → 5.0.9; `fast-uri` 3.1.4 → 3.1.5; `js-yaml` 3.15.0 → 3.15.1 and 4.3.0 → 4.3.1; and `nanoid` 3.3.16 → 3.3.18.
- Made no direct dependency or major-version upgrade, left `package.json` unchanged, added no npm override, and did not use `npm audit fix`.

### Known issues

- Registry-backed before/after vulnerability counts could not be verified because the npm advisory API returned HTTP 403; the targeted vulnerable lockfile versions are absent after the refresh.
- Dependency-security remediation is not complete. Wrangler and Cloudflare tooling remediation remains pending, and Next.js, PostCSS, and Sharp compatibility investigation remains pending. The later work also owns the remaining `miniflare` and `undici` dependency families.

## 2026-08-08 — Dependency security audit diagnostic

### Added

- Added a temporary, manually triggered Node.js 24 diagnostic workflow that records npm audit, production-only audit, JSON audit, and outdated-package results without changing dependencies or deploying.
- Added a downloadable 14-day JSON audit artifact and explicit command exit-status reporting for vulnerability-bearing audit runs.

### Known issues

- Dependency review and remediation remain outstanding until maintainers run the workflow and assess its registry-backed results.

## 2026-08-08 — Cloudflare environment ownership hardening

### Added

- Added pre-deployment validation for required Cloudflare production build-variable names and documented build, runtime, and browser configuration ownership.
- Added ADR-0011 for persistent Cloudflare environment ownership.

### Changed

- Enabled Wrangler preservation of deliberately platform-managed Worker runtime variables while retaining the existing repository-declared API binding.
- Expanded the frontend environment example with supported public Storage bucket names.

### Removed

- Removed the old deploy-capable GitHub Actions frontend workflow so Cloudflare native Git is the sole automatic frontend deployer.

## 2026-08-07 — Clean-install Prisma Client bootstrap

### Fixed

- Made root dependency installation generate Prisma Client before clean-runner typecheck, build, and tests, and removed duplicate generation from the API build command.
- Clarified the PR quality-gate install step so Prisma bootstrap failures are diagnosed before typecheck.

## 2026-08-07 — Phase 1 API tests and pull-request quality gates

### Added

- Added deterministic API tests for monitoring endpoints, optional dependency readiness, request correlation, and safe structured request logging.
- Added a Node.js 24 pull-request verification workflow with locked dependency installation, documentation and secret checks, typecheck, builds, tests, and whitespace validation; it performs no deployment.

### Changed

- Consolidated pull-request documentation validation into the broader quality-gate workflow and established a passing root workspace test baseline.

## 2026-08-07 — Phase 1 API monitoring and operational hardening

### Added

- Added lightweight API liveness metadata and dependency-aware readiness endpoints.
- Added structured JSON request, error, and startup logging with request-ID generation and propagation.
- Added operational endpoint contracts, correlation workflow, and monitoring troubleshooting guidance.

### Changed

- Changed `/api/v1/health` from a database-dependent response to a lightweight process liveness response while retaining its route and successful HTTP contract for Railway.

## 2026-08-07 — Railway API startup migration cleanup

### Fixed

- Removed the API workspace's duplicate Prisma migration invocation so Railway's root `deploy:api` path runs deployment migrations exactly once before starting NestJS from `dist/main.js`.

## 2026-08-07 — Repository documentation policy

### Added

- Made synchronized engineering documentation a repository-wide Definition of Done through root Codex instructions and an explicit update matrix.
- Added PR validation that fails documented implementation categories with no `docs/` change and gives human-readable remediation guidance.
- Added ADR-0008 and documented the documentation workflow itself.

## 2026-08-07 — Hestiva OS migration and recovery

### Changed

- Renamed the product and active repository/workspace identities to Hestiva OS.
- Cleaned repository naming and deployment configuration while retaining compatibility-sensitive legacy endpoint references.
- Established Cloudflare native Git builds as the single active frontend deployment authority.

### Fixed

- Repaired Railway monorepo workspace resolution, API build/start configuration, and health checking.
- Repaired the Next.js OpenNext build and Cloudflare Worker deployment configuration.
- Recovered Railway, Cloudflare, and Supabase environment configuration in their protected platform scopes without committing values.

### Known issues

- Railway API hostname retains legacy `mmapi` naming.
- API startup executes Prisma migrations twice.
- Root tests fail because the API currently has no tests.
- Dependency review remains outstanding.

## 2026-08-10 — Product Implementation Slice 5: Employee Records

### Added

- Added an ADMIN-only `/employees` experience with lean sectioned create/edit records, name/phone/email search, employment-status filtering, linked crew context, and read-only OS access summaries.
- Added narrow ADMIN-only Employee Records list, detail, create, and update API contracts with strict field, email, status, and date validation and privacy-limited list projections.
- Added the additive canonical `EmployeeRecord` model, independent employment status, optional unique User and Technician links, focused migration, tests, and ADR-0016.

### Preserved

- Preserved all existing Users, Technicians, crews, shifts, work assignments, roles, and access statuses without inferred backfill or destructive deletion. Payroll, leave, performance management, document storage, advanced HR functionality, and expanded management permissions remain outside this slice.

## 2026-08-10 — Slice 5F customer continuation and Team navigation

### Changed

- Made Contact name the required human-facing Customer field, retained `Customer.name` as legacy compatibility data, and derived it for new and explicitly edited records.
- Changed successful new-Customer continuation to a validated document navigation into Property creation; edits and failed/invalid create responses do not start that flow.
- Consolidated Technicians, Crews, and Shift Planning beneath an accessible Team disclosure shared by desktop and mobile navigation; moved Employee Records ownership to Admin Settings while retaining Services there.

### Preserved

- Preserved historical Customer names and relationships, Employee Records authorization, the canonical Service catalogue, authentication, CORS, Prisma schema, deployment configuration, and Property-to-Work-Order continuation.

## 2026-08-10 — Product Slice 5G — Website Property Types and customer data cleanup

- Added a production-safe, idempotent migration for the website-approved Property Types Apartment, Townhouse, House, Duplex, and Other. Case/whitespace equivalents, inactive approved values, custom values, historical relationships, and null assignments are preserved; “Not classified” is not seeded.
- Moved canonical Business Lists management to `/admin/settings/business-lists` and corrected the Property form and Admin Settings links so they no longer route through Employee Records.
- Added exact-ADMIN impact and destructive cleanup endpoints plus a two-step Admin Settings Data Management UI requiring the authoritative Customer Contact name.
- Cleanup explicitly removes the Customer-owned Work Order child rows, Work Orders, Properties, and Customer inside one Prisma transaction while preserving and detaching shared Shifts and preserving all other shared records.
- Documented that photo metadata is deleted but Supabase Storage objects are not, so possible orphaned objects are reported rather than hidden.
- Added focused migration, API transaction/confirmation/count, authorization, route, warning, and normal-deletion regression coverage. Website Bedrooms (Studio, 1, 2, 3, 4, 5+) remain deferred.

## 2026-08-10 — Product Slice 5H — Cleanup confirmation and Work Order references

- Preserved case-sensitive exact Customer cleanup confirmation while adding explicit mismatch feedback and a readable, narrowly scoped disabled destructive action; deletion semantics are unchanged.
- Added server-generated immutable `WO-YYYYMMDD-####` references using Africa/Johannesburg creation-day semantics, an atomic database daily counter, serializable creation transaction, overflow protection, and database uniqueness.
- Removed manual Title entry from normal Work Order creation, added the canonical active Service relationship, structured Service/Customer/Property labels, reference search, and historical nullable-reference/Service plus legacy-title compatibility.

## 2026-08-10 — Product Slice 5I — Accepted-quote Work Order structure

- Restructured new Work Orders around exactly one active canonical PRIMARY Service, separate zero-to-many canonical ADD_ON relationships, controlled accepted-quote frequency, and controlled visit-specific home condition.
- Added backend validation for service type/status, duplicate add-ons, frequency/custom-note behavior, and home-condition values while preserving nullable and inactive historical relationships.
- Reorganized Work Order creation into job, Property snapshot, visit instructions, and assignment concepts; retained Customer/Property continuation, automatic immutable reference generation, structured labels, and existing operational assignment/scheduling fields.
- Deferred persistent Property quote fields to Slice 5J, catalogue/scope reconciliation to 5K, recurring agreements to 5L, and website handoff to 5M.

## 2026-08-10 — Product Slice 5J — Property operational profile

- Added nullable, controlled bedrooms, bathrooms, living-area, and storey facts plus lean persistent access, logistics, pet, camera, off-limits, fragile-care, product-restriction, and operational allergy fields to Property without backfilling historical data.
- Restructured Property create/edit into progressive Identity, Address, Home Profile, Access & Logistics, and Household & Care sections while retaining dormant Province compatibility and the managed Property Type relationship.
- Updated office Work Order Property summaries and Technician job views to read actionable current Property data without copying it onto Work Order; added an identifying-only Property selector privacy boundary.
- Deferred floor size, outdoor status, entry arrangement, and presence defaults pending verified vocabularies/ownership, and preserved Slices 5K–5O.

## 2026-08-10 — Slice 5K current website reconciliation revision

- Reconciled against the current `src/routes/quote.tsx` vocabulary and removed the undeployed Service Scope schema, migration bootstrap, APIs, UI, tests, and ADR that had relied on stale website options.
- Added `BOTH` Service availability so Interior Window Cleaning and Laundry Folding remain one canonical capability selectable as primary or add-on, without duplicate Services.
- Added the current, distinct Ironing, Bed Making, Linen Change, Garage Sweeping, Extra Bathroom Cleaning, and Pet-Hair Treatment add-ons through fixed-ID conflict-safe bootstrap logic.
- Corrected current frequency and add-on aliases, kept Extra refrigerator quantity semantics unresolved, and documented current Property vocabulary and a focused pre-5M Property alignment follow-up.

## 2026-08-10 — Slice 5J-A Property quote vocabulary alignment

- Added nullable controlled Property floor-size, outdoor-area, estate-classification, and unit-floor fields.
- Added exact current bedroom/storey outcomes and backend Property-Type combination validation.
- Preserved the deployed estate boolean and ambiguous `THREE_PLUS` without fabricated backfill.
- Updated Property editing and live Work Order Property summaries while keeping selector payloads lean.

## 2026-08-10 — PR #69 and PR #70 production migration recovery

- Split Slice 5K so `ServiceType.BOTH` commits in the already-seen migration name before a consecutive migration uses it for catalogue reconciliation, correcting PostgreSQL 55P04 / Prisma P3018.
- Recorded that the unresolved failed PR #69 row causes Prisma P3009 and blocks PR #70; preserved the independently additive, earlier-ordered Property vocabulary migration unchanged.
- Added clean and staged PostgreSQL migration replay to pull-request checks, plus an operator-gated, read-only-first recovery procedure. No product behavior, Work Order data, environment configuration, or Cloudflare deployment changed.

## 2026-08-10 — PR #71 clean-replay follow-up

- Corrected the earlier assessment of PR #70 after PostgreSQL 17 clean replay proved an independent history defect: 5J-A referenced `BedroomCount` and `StoreyCount` before their lexically later origin migration.
- Made the two affected historical migrations converge safely whether the base profile types already exist or a clean replay reaches 5J-A first. The repair is additive and performs no Property backfill or value rewrite.
- Expanded executable replay assertions to cover all eight Property vocabulary types/columns, compatibility enum values, and a finished row for every migration while preserving the PR #69 enum commit boundary.

## 2026-08-10 — PR #71 staged-replay harness correction

- Removed the staged replay harness's invalid dependency on an untracked, nonexistent `migration_lock.toml`; the successful clean PostgreSQL replay was unchanged.
- Reconstructed pre-5K state directly from checked-in migration directories ordered before the exact 5K boundary, and added assertions that the staged phase finished exactly that set before the full chain runs.
- Preserved both PostgreSQL 17 replay gates and all Property and Service reconciliation assertions.

## 2026-08-11 — Slice 5L recurring service agreements

- Added Property-owned recurring service agreements, canonical recurring add-ons, controlled lifecycle/weekday/time-window values, and Work Order occurrence links through an additive Prisma migration.
- Added Johannesburg-aware weekly, anchored every-two-weeks, and clamped monthly recurrence; CUSTOM remains visibly manual.
- Added authorized operational APIs and UI for agreement creation, lifecycle changes, and explicit idempotent one-upcoming-visit generation with normal Work Order references and snapshot semantics.
- Integrated recurring agreements into ADMIN Customer Data Cleanup and preserved Services, historical visits, 5M, 5N, 5O, and unresolved 5K commercial decisions.

## 2026-08-13 22:16 SAST — Local Supabase JWT verification performance

### Changed

- Replaced the API authentication guard's per-request Supabase Auth `/auth/v1/user` network verification with local cryptographic ES256 JWT verification against Supabase's public JWKS.
- Added a ten-minute in-process JWKS cache and forced refresh for unknown signing-key IDs to support key rotation.
- Preserved HestivaOS application-user lookup, ACTIVE-status enforcement, role authorization, and the `/users/sync` bootstrap exception.
- Added JWT verification tests covering valid authentication, authorization roles, disabled users, expired tokens, and invalid audiences.
- Updated the performance, environment, architecture, recovery, decision, and engineering-history documentation for the authentication change.

### Performance

- Protected API requests no longer require a Supabase Auth `/user` network round trip after JWKS warm-up.
- Supabase remains the identity and signing-key authority; authentication continues to fail closed when a token cannot be cryptographically verified.

## 2026-08-16 — Accepted Quote operational context

- Added non-lossy typed Work Order context for accepted ONE_TIME and initial recurring visits.
- Added stable recurring instruction/time/eco preference inheritance without temporary access propagation.
- Linked accepted Quote photos without blob duplication and separated customer declarations from cleaner evidence.
- Added a visit-scoped temporary access credential data boundary with expiry/revocation metadata.

## 2026-08-17 — Crew and Job leadership foundation

### Added
- Canonical Work Order Job Leader relationship and audited Admin reassignment.
- Automatic leadership for single-Technician Crews and Work Orders, with Crew Leader defaulting for Crew-based assignment.

### Changed
- Active Crew validation now requires at least one eligible member and exactly one member leader.
- Crew and Work Order staffing UI now identifies operational leaders without treating them as Supervisors.

### Migration
- Single-assignment historical Work Orders receive that Technician as Job Leader; ambiguous multi-Technician history remains unresolved rather than guessed.

## 2026-08-17 — Homent Technician B1

- Added an installable, mobile-first Homent Technician route with Today, Upcoming, Recent, minimized Job Brief, team/Job Leader states, and understandable sync state.
- Added assignment-enforced Technician APIs and a Job-Leader-only, optimistic/idempotent Start Job transition to `ON_SITE` with `startedAt`, Technician attribution, and one audit activity.
- Added bounded IndexedDB job caching, durable outgoing Start operations, opportunity-driven reconciliation, and safe known-removal/cancellation behavior without polling or sensitive credential caching.

## 2026-08-17 — Homent Technician frozen Execution Scope and compressed checklist

### Added

- Added Draft/Published/Retired Service Scope versions and preserved Work Order scope revisions generated at section-level granularity from confirmed Property quantities.
- Added Start Job revision binding, append-only/idempotent section outcomes, controlled Not Completed reasons, proportional evidence state, safety-stop foundation, Job Leader exception-first review, and durable offline outcome operations.

### Preserved and deferred

- Existing rows are not given invented historical scope. B1 assignment, leadership, lifecycle, schedule, brief, cache and reconciliation remain in place. Full photo transport, incident/damage resolution, scope mismatch, additional work, customer correspondence, Complete Job, and Homent Supervisor remain deferred.

## 2026-08-17 — Homent Technician D offline evidence

### Added

- Added shared mobile WebP compression, IndexedDB v3 durable evidence Blob storage, sequential retryable upload, deterministic evidence paths, and idempotent backend acknowledgement.
- Added stable REQUIRED section and exception evidence identities, assignment/scope/section authorization, local-first checklist progression, worker sync wording, and acknowledged-only bounded Blob cleanup.

### Preserved and deferred

- Generic Work Order BEFORE/AFTER photos retain their model and behavior while reusing the compressor; `/technician` remains canonical. Complete Job, full incident/damage/scope-mismatch resolution, notifications, protected credentials, Homent Supervisor, and a broad legacy bucket privacy migration remain deferred.

## 2026-08-18 — Homent Technician Complete Job

- Added Job Leader-only offline completion with durable UUID operations, readiness blockers, read-only local completion, retry and retained conflict states.
- Added authoritative idempotent completion that rechecks the frozen scope and accepts locally captured evidence while upload remains pending before moving the Work Order to `COMPLETED`.
- Added audited ADMIN/SUPERVISOR acknowledgement and correspondence eligibility without sending any customer message; removed the legacy competing Complete job status action.

## 2026-08-18 — Phase 3A Access Readiness Foundation

### Added

- Added six controlled visit-specific Work Order readiness states, append-only transition history, and ADMIN/SUPERVISOR management controls.
- Added a deterministic, self-resolving `WORK_ORDER_ACCESS_REQUIRED` Needs Attention condition for missing, review-required, or expired access.
- Added focused API/UI tests and deployment/recovery/architecture documentation with ADR-0058.

### Preserved and deferred

- Work Order lifecycle, scheduling, assignment, dispatch, execution, completion, cancellation, customer correspondence, and Finance are unchanged.
- Temporary credentials are not selected, exposed, copied, stored, or broadened. Protected credential review, appointment-relative escalation, and messaging recovery remain Phase 3B–3D.
