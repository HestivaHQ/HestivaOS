# HestivaOS performance audit

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
