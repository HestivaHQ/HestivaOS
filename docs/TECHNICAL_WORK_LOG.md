# Technical work log

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
