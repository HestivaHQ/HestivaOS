# Changelog


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
