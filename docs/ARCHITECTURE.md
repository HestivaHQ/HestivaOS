# Production architecture

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

The browser requests the Cloudflare Worker. Server-rendered web code uses `API_URL`; browser code uses the build-time `NEXT_PUBLIC_API_URL` to call the Railway API. The API applies application rules, validates Supabase identities, and reads or writes Supabase PostgreSQL through Prisma. Web features use Supabase authentication and Storage with public client configuration embedded during the frontend build. `NEXT_PUBLIC_*` values are intentionally browser-visible and require a rebuild when changed. Railway owns API runtime configuration. Secret values remain in each platform's protected settings, never Git.

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

Dashboard schedule rows use `WorkOrder.title` as the current job label because `WorkOrder` has no direct `Service` relation. Property address fields provide the compact location, and assignment prefers a crew, then a technician, then a prominent unassigned state. Worker Issue and Job Exception alerts are not emitted because corresponding functional models do not yet exist.

## Profile and administrative settings boundary

The existing application `User` remains the single profile record and Supabase Auth remains the authentication identity and credential authority. `PATCH /api/v1/users/me/profile` accepts only `firstName`, `lastName`, `displayName`, `phoneNumber`, and `profilePhotoUrl`; it does not update email, role, job title, or department. Existing workforce-related columns and role enums remain unchanged for future modules.

The web application displays the Supabase-authenticated email read-only and sends password changes directly to the installed Supabase client through `auth.updateUser({ password })`; passwords never pass through or persist in the Hestiva API. The canonical `/admin/settings` route synchronizes the authenticated application User on the server and renders only when that record has the exact `ADMIN` role. All other roles redirect to the dashboard. Its User Access and Business Profile cards link to their implemented management routes.

## Canonical Business Profile

`BusinessProfile` is the single authoritative in-OS company-information record. The database restricts its primary key to `hestiva`; the API always addresses that key and returns only business fields and share booleans. Typed fields are organized in exactly three presentation and future permission boundaries: General Business Information, Banking & Payment Information, and Compliance & Official Information. The model deliberately contains no authentication, banking-login, PIN, OTP, token, or generic secret fields.

`GET` and `PATCH /api/v1/admin/business-profile` require the exact `ADMIN` role through controller metadata and the global authenticated-user guard. The web route also checks the synchronized role before reading. Updates use an explicit allowlist and return neither the singleton key nor timestamps. Mutation logs contain the actor identifier and changed field names only; persistent audit history is deferred because the repository has no appropriate general audit model.

Each shareable field has a persisted boolean. General customer-facing fields default on; banking and compliance fields default off. These are content-selection preferences, not field authorization. WhatsApp uses a recipient-less `wa.me` open, email uses `mailto:`, and copy uses the browser clipboard with a fallback; there is no outbound messaging backend. The formatter includes only selected non-empty approved fields. Completeness is the percentage of five non-empty core fields: registered name, registration number, contact number, business email, and business address. Optional banking, VAT, tax, website, and trading-name values do not affect it. Future management view/share group permissions and reuse for quotations, invoices, email, and generated documents are deferred; canonical editing remains ADMIN-only.
