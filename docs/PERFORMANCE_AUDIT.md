# HestivaOS performance audit

## 2026-08-28 — Navigation and authentication architecture

Routine office navigation previously ran Supabase `auth.getUser()` in middleware, called write-capable `POST /users/sync` from each protected page, and rebuilt `AppFrame` inside every page. The current architecture replaces those critical-path operations without weakening the authentication or application-authorization boundaries.

### Implemented on `perf/navigation-auth-architecture`

- Middleware now uses Supabase `auth.getClaims()` so asymmetric JWT signatures and expiry are verified through the installed Supabase JWKS path without a routine Auth `/user` request. Missing configuration or unverifiable claims fail protected routes closed, and middleware continues to propagate refreshed cookies.
- Login remains the explicit `/users/sync` bootstrap/reconciliation boundary. Protected navigation uses read-only `GET /users/me`; the API returns the ACTIVE application User already resolved by its global guard, so ordinary navigation performs neither reconciliation writes nor a duplicate User lookup.
- Office routes now share one authenticated App Router layout containing the Homent desktop sidebar, mobile navigation, account UI, and role-sensitive navigation. Pages render only route content, and a shared in-shell `loading.tsx` supplies immediate transition feedback while preserving the shell.
- Root `force-dynamic` was removed. Authenticated cookie access remains dynamic at the protected layout boundary while unrelated root/public work is no longer blanket-forced dynamic.
- ADMIN and SUPERVISOR page checks remain supplementary to API authorization. The API continues local ES256 verification, canonical User existence and ACTIVE enforcement, and route-role enforcement.

### Request-path change

Previously, a protected transition waited for Cloudflare middleware → remote Supabase `getUser` → page session read → API `/users/sync` → API local JWT verification → User lookup plus serializable reconciliation transaction → page-local shell construction → route data. Now it uses middleware locally verified claims → persistent authenticated layout → cached server session token → API `GET /users/me` with local JWT verification and the guard's canonical ACTIVE User lookup → streamed route content. Login alone retains reconciliation.

### Deliberately deferred

Browser/API topology, client-manager request fan-out, reference-data batching, and broader route data-loading changes remain PR 2 scope. This slice records no unmeasured latency claim.

## 2026-08-14 — UI/UX speed pass 2G: dashboard payload slimming

The live dashboard had already reduced its database operation count, but each of the three remaining Work Order queries still selected broad related records and the response duplicated upcoming and overdue records that the current dashboard does not render.

### Implemented on `perf/dashboard-payload-slimming`

- Today's scheduled Work Orders now use explicit Prisma `select` fields limited to the values actually rendered by the dashboard: ID/reference/title/status/time, assignment IDs, customer display-name inputs, visible address fragments, Service name, Technician name, and Crew name.
- Upcoming Work Orders now select only `scheduledAt`, `technicianId`, and `crewId`, which are the only fields required to build the seven-day job/unassigned summary.
- Actionable overdue Work Orders now select only IDs because the current dashboard consumes only their count. The top-level legacy upcoming and overdue arrays remain present as empty compatibility fields rather than duplicating records the page never reads.
- The dashboard keeps the same three-query boundary, Johannesburg date semantics, today status/assignment rules, visible UI content, route, authentication, authorization, Prisma schema, migrations, and deployment configuration.

### Remaining measured work

- The operational dashboard response still carries legacy zero/empty analytics fields for compatibility. Removing those outer fields entirely should be treated as an explicit contract cleanup rather than bundled into payload selection work.
- Future performance work should now be selected from observed manager/API/render bottlenecks rather than assuming authentication or dashboard query count remains dominant.

## 2026-08-14 — UI/UX speed pass 2F: Business Lists authenticated wrapper cleanup

Admin Settings → Business Lists now uses the same authenticated server API boundary as the rest of the protected server-rendered application instead of reading the Supabase session separately at the page level.

### Implemented on `perf/business-lists-auth-wrapper`

- Added `businessLists(includeInactive)` to `createAuthenticatedApi()`, reusing the access token from the single server-side Supabase session already acquired by that wrapper.
- Business Lists now creates one authenticated server API instance, synchronizes the authoritative HestivaOS application user, preserves the existing ADMIN role check, loads Business Lists through the wrapper, and uses `appUser.email` for shell presentation.
- Removed the page's separate `createClient()`, `auth.getSession()`, direct `session.access_token` plumbing, and direct `api.businessLists(...)` call.
- Supabase remains the credential and identity authority. The wrapper still fails closed when no authenticated session/access token exists; API JWT verification, application-user synchronization, ACTIVE-status enforcement, ADMIN authorization, and existing Business Lists API behavior remain unchanged.
- No API endpoint, Prisma schema, migration, domain workflow, deployment setting, dependency, or production configuration changed.

### Next measured target

- The dashboard remains the clearest payload-level hotspot: its three optimized Work Order queries still return broad related records, while the current UI consumes only a narrow subset for today's rows and aggregate counts for upcoming/overdue work. A dedicated dashboard DTO/select pass should be evaluated separately from this wrapper cleanup.

## 2026-08-14 — UI/UX speed pass 2E: final page-wrapper auth cleanup

The remaining routine protected page wrappers now use the same single-authoritative-user bootstrap pattern established in earlier performance passes, eliminating redundant page-level Supabase user verification where the provider response was used only for shell email presentation.

### Implemented on `perf/final-page-auth-cleanup`

- Technicians, Crews, Shift Planning, and Work Order detail now resolve the authoritative HestivaOS application user once through `createAuthenticatedApi().syncUser()`, use `appUser.email` for shell identity, and pass that same user into `AppFrame`.
- Admin Settings, Employee Records, Admin Services, User Access, Business Profile, and Customer Data Cleanup retain their existing HestivaOS role checks while dropping the separate Supabase `auth.getUser()` call that previously supplied only the email address.
- Supabase remains the credential and identity authority. Protected-route middleware, authenticated API token acquisition, local API JWT verification, application-user synchronization, ACTIVE-status enforcement, role authorization, and fail-closed behavior remain unchanged.
- No API contract, Prisma schema, migration, domain workflow, deployment setting, dependency, or production configuration changes in this pass.

### Deliberate exception and remaining measured work

- Admin Settings → Business Lists is intentionally unchanged. It currently consumes `supabase.auth.getSession()` because the page passes `session.access_token` directly into `api.businessLists(...)`; removing that provider session read requires a separate API-helper refactor rather than the presentation-only cleanup applied here.
- After this pass, routine page-wrapper duplicate Supabase user verification is no longer the main performance target. Remaining work should be selected from measured network payload, API/data loading, rendering, or interaction bottlenecks rather than continuing auth micro-optimizations by default.
- The dashboard still returns broad related Work Order records for response compatibility; a later payload-specific pass may introduce a narrower dashboard DTO if measured network payload remains material.

## 2026-08-14 — UI/UX speed pass 2D: secondary-page authentication cleanup

Profile, Services, and Cleaning Job Templates now use the same single-authoritative-user page bootstrap already established on the primary operational routes.

### Implemented on `perf/secondary-auth-cleanup`

- Profile no longer calls Supabase `auth.getUser()` and `auth.getSession()` before synchronizing the HestivaOS application user. The authenticated API bootstrap remains the fail-closed session boundary, and the synchronized application user's email is used for shell identity and the read-only authenticated-email field.
- Services and Cleaning Job Templates no longer perform a page-level Supabase `getUser()` call solely to obtain the shell email. Each page resolves the authoritative HestivaOS application user once and supplies it directly to `AppFrame`.
- `AppFrame` no longer performs a second `syncUser()` call on these three routes because the page supplies the synchronized user explicitly.
- Supabase remains the credential and identity authority. Protected-route middleware, authenticated API token acquisition, API JWT verification, ACTIVE-status enforcement, role authorization, and fail-closed behavior are unchanged.
- No API contract, database schema, migration, business workflow, deployment setting, or production configuration changes in this pass.

### Remaining hot paths

- Team page wrappers and Admin Settings pages still need the same measured page-level authentication review where they retain duplicate Supabase reads.
- The dashboard still returns broad related Work Order records for compatibility; a later payload-specific pass may introduce a narrower dashboard DTO if measured network payload remains material.

## 2026-08-14 — UI/UX speed pass 2C: Team load optimization

The Team area now avoids repeated list traffic during common search and date-range interactions without changing Team business rules or API contracts.

### Implemented on `perf/team-load-optimization`

- Technician search is debounced by 300 ms instead of issuing an API request on every keystroke.
- Crew search is debounced by 300 ms and refreshes only the crew list. The full technician reference list used for crew membership and leader selection now loads once when the screen opens rather than reloading on every crew-search change.
- Shift Planning now separates range-dependent shift loading from reference data. Crews, technicians, and Work Orders load once when the screen opens; changing `dateFrom` or `dateTo` refreshes only the shift list for that range.
- Shift create/update/copy/delete operations refresh only the visible shift list because those actions do not mutate crew, technician, or Work Order reference records.
- Existing save/delete behavior, crew membership rules, shift assignment semantics, date filters, list page sizes, API contracts, authentication, authorization, Prisma schema, migrations, and deployment configuration are unchanged.

### Remaining hot paths

- Several protected Team and secondary pages still perform page-level Supabase `getUser()` calls before `AppFrame` synchronizes the HestivaOS user. A direct Technicians page cleanup was attempted in this pass but the connector blocked the write twice; the file was verified unchanged and was not bypassed.
- Services, Cleaning Job Templates, Profile, and Admin Settings pages still need measured navigation/load review.
- The dashboard still returns broad related Work Order records for compatibility; a later measured payload-specific pass may introduce a narrower dashboard DTO if network payload size remains material.

## 2026-08-14 — UI/UX speed pass 2B: dashboard query slimming

The Admin dashboard now serves the live daily command-centre from a focused operational query service rather than calculating historical analytics that the current UI does not render.

### Implemented on `perf/dashboard-query-slimming`

- The live `/dashboard` controller keeps its existing route and injection token, while the Dashboard module binds that token to `OperationalDashboardService`.
- The live dashboard database boundary drops from 21 transaction operations to three Work Order list queries: today's scheduled jobs, the next seven calendar days of scheduled jobs, and actionable overdue jobs.
- Today status counts, today unassigned count, upcoming daily summaries, upcoming unassigned count, and overdue day counts are derived in memory from those three result sets.
- Africa/Johannesburg business-day boundaries, today workload status exclusions, crew-or-technician assignment semantics, and the current dashboard response shape are preserved.
- Legacy top-level analytics fields that the current UI does not render remain temporarily present as zero-cost compatibility placeholders. Their expensive historical queries are no longer executed by the live route; removing those legacy response fields is a separate contract-cleanup task.
- The original `DashboardService` remains in the repository temporarily for its existing pure helper tests and as an explicit rollback/reference path, but it is no longer the provider used by the live dashboard controller.

### Remaining hot paths

- Several lower-frequency protected pages still perform page-level Supabase `getUser()` calls before `AppFrame` synchronizes the HestivaOS user.
- The three operational Work Order queries still return broad related records for contract compatibility. A later measured pass may introduce a narrower dashboard-specific DTO if payload size remains material after query-count reduction.

## 2026-08-14 — UI/UX speed pass 2A: navigation authentication

The second UI/UX performance pass continues the existing single-authoritative-user pattern without weakening authentication or application access enforcement.

### Implemented on `perf/web-navigation-auth`

- Dashboard, Customers, Properties, Work Orders, and Recurring Services no longer call Supabase `auth.getUser()` after protected-route middleware has already verified navigation. Each page resolves the authoritative HestivaOS application user once through the authenticated API, supplies that user to `AppFrame`, and uses the application user's email for shell presentation.
- Successful login now performs `router.replace(nextPath)` without an immediate `router.refresh()`, avoiding a redundant post-login render/request cycle.
- Middleware authentication, Supabase identity ownership, HestivaOS ACTIVE-status enforcement, route-role authorization, and fail-closed behavior are unchanged.

### Verified remaining hot paths

- Several lower-frequency protected pages still perform page-level Supabase `getUser()` calls before `AppFrame` synchronizes the HestivaOS user. They remain candidates for the same single-user pattern in a later focused pass.
- The dashboard API still performs broad historical, technician, activity, aggregate, and list queries that the current daily command-centre UI does not render. Dashboard response/query slimming remains the next high-impact backend performance target.

## 2026-08-13 — UI/UX speed pass 1

This audit records verified performance work undertaken because routine HestivaOS administration and manual testing had become slow enough to materially increase development time. The first implementation pass is deliberately narrow: reduce redundant authentication work and unnecessary repeated list loading without changing authorization, domain behavior, or workflow ownership.

### Implemented in PR #85

- Customers no longer performs an unused session fetch and then causes `AppFrame` to synchronize the same application user again. The page resolves the application user once and supplies it to the shared shell.
- Work Orders applies the same single-user-sync pattern.
- Work Order reference data (customers, properties, technicians, crews, primary services, and add-ons) is loaded separately from the work-order queue. Searching the queue no longer reloads all six reference datasets.
- Work Order search is debounced by 300 ms and refreshes only the work-order list.
- Customer search is debounced by 300 ms instead of issuing a request on every keystroke.

### Verified remaining hot paths

- The web middleware verifies the Supabase user for protected navigation, while many server-rendered pages also call Supabase user verification again.
- `AppFrame` synchronizes the HestivaOS application user when a page does not supply one, which can add another API request during navigation.
- The dashboard overview currently executes a broad set of database reads and aggregates, including data not required by the present daily command-centre UI. A later performance change should reduce that over-fetching rather than weakening correctness.
- The login client currently performs navigation and then an explicit router refresh; this is under review as a redundant post-login render.

## 2026-08-13 — API local JWT verification

The API authentication guard previously requested Supabase Auth `/auth/v1/user` for every protected API request. That remote verification was a system-wide latency multiplier because pages commonly make several authenticated API calls in parallel.

The Supabase project was verified to use the current asymmetric ECC P-256 signing-key configuration. The API guard now verifies ES256 bearer tokens cryptographically against Supabase's public JWKS endpoint. Public JWKS data is cached in-process for ten minutes; an unknown `kid` forces one refresh so signing-key rotation can be discovered without waiting for cache expiry.

Local verification remains fail closed. Tokens must have a valid ES256 signature and signing-key identifier, the expected Supabase issuer, the `authenticated` audience, a non-empty subject, and valid expiry/not-before timing with a narrow clock-skew allowance. Malformed, expired, incorrectly scoped, unverifiable, or unknown-key tokens are rejected. The existing HestivaOS application-user lookup, ACTIVE-status enforcement, synchronization exception, and route-role authorization remain in place.

This removes the per-request Supabase Auth user network call after JWKS warm-up. It does not remove Supabase as the identity authority and does not trust decoded JWT payloads without signature verification.

### Guardrails

Performance changes must preserve application access enforcement, role checks, Supabase identity ownership, auditability, and fail-closed behavior. Security checks are not bypassed merely to improve perceived speed.
