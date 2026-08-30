# HestivaOS browser audit V1

Status: Active browser-audit foundation
Introduced: 2026-08-29

## Purpose

HestivaOS has reached the point where type-checking, source-level regression tests, API tests, build validation and migration replay are necessary but not sufficient evidence that the operating workflows still work as a user experiences them.

This browser audit adds a deliberately separate end-to-end diagnostic layer. It is intended to answer three questions:

1. Can an authorised operator actually open and move through the important OS surfaces without browser exceptions or server 5xx failures?
2. Which routes or client-side transitions are materially slower than the rest of the OS on representative deployed data?
3. Once a safe isolated mutation environment exists, do the business workflows complete end to end rather than merely compiling or passing unit tests?

The browser audit is diagnostic. It does not replace the mandatory PR quality gates, API authorization, domain tests, migration replay, or manual operational acceptance.

## Current foundation

`.github/workflows/os-browser-audit.yml` is a manual `workflow_dispatch` diagnostic. It runs Chromium against an explicitly supplied HestivaOS origin using a dedicated browser-audit ADMIN identity stored only in GitHub Actions secrets.

The current executable matrix is production-compatible and deliberately non-mutating. It:

- signs in through the real login UI;
- records sanitized authentication-stage diagnostics when sign-in fails, limited to the generic login-page status plus whether the Supabase password request and HestivaOS `/users/sync` request were not observed, failed before an HTTP response, or returned a numeric HTTP status;
- verifies authenticated shell readiness;
- opens the primary and important secondary/admin routes on desktop and mobile Chromium;
- exercises bounded read-only UI interactions on Customers, Properties and Admin Settings, including search-input behavior, native required-field validation, expandable property sections and settings-link availability;
- never submits a valid create/edit form or invokes delete/send/complete/assign/upload/provider mutations in the production-safe project;
- fails on document HTTP errors, browser page exceptions, or HTTP 5xx responses observed during a route or interaction check;
- samples desktop client-side navigation timing across the primary shell;
- samples Work Orders navigation three times independently because Work Orders has been observed to feel slightly slower than neighbouring routes;
- writes only a sanitized JSON timing summary containing route names, route paths, project name and elapsed milliseconds.

No screenshots, videos, Playwright traces, storage-state files, customer payloads, browser console dumps, access tokens or credentials are uploaded as workflow artifacts. Authentication diagnostics never read or print response bodies, request bodies, tokens, passwords, email values, full request URLs or browser storage. Authentication state is ephemeral runner data under `.playwright/` and is git-ignored.

## Current executable route matrix

### Primary authenticated shell

- Dashboard `/`
- Management `/management`
- Customers `/customers`
- Properties `/properties`
- Quotes `/quotes`
- Work Orders `/work-orders`
- Recurring Services `/recurring-services`
- Technicians `/technicians`
- Crews `/crews`
- Shift Planning `/shifts`
- My Profile `/profile`

### Secondary / Admin surfaces

- Create Work Order `/work-orders/new`
- Employee Records `/employees`
- Service Catalogue `/services`
- Cleaning Job Templates `/cleaning-job-templates`
- Admin Settings `/admin/settings`
- Admin Services `/admin/settings/services`
- Service Scope Templates `/admin/settings/service-scopes`
- Messaging `/admin/messaging`

The ADMIN browser-audit identity is required so the read-only sweep can traverse the broadest office surface. API authorization remains authoritative; the audit does not create a browser-side role bypass.

## Production-safe interaction coverage

The production-safe project now goes beyond route-open checks where the UI can be exercised without changing business state:

- Customers: fill the search field with a guaranteed audit-only no-match value and verify the control remains usable; attempt an empty create submission and verify native required-field validation blocks it before any valid mutation can be sent.
- Properties: exercise the customer lookup with an audit-only no-match value and open the Access & logistics and Household & care sections without submitting the property form.
- Admin Settings: verify that the page exposes at least one visible settings destination link without following a mutation path.

These checks are intentionally bounded. Search requests may perform normal read-only API calls, but the project does not create, update, delete, send, complete, assign or upload operational records. Mutation coverage remains blocked on the isolated-fixture boundary below.

## Full functional scenario map

The long-term audit is one coordinated system, not a sequence of independent ad-hoc page tests. Scenarios are grouped by business journey so a failure identifies the broken boundary.

| Journey | Representative browser scenarios | V1 execution state |
| --- | --- | --- |
| Authentication and access | valid sign-in; invalid sign-in; protected-route redirect; role-visible navigation; inactive/unauthorised access | Valid ADMIN sign-in + protected route access active; sanitized Supabase/password and `/users/sync` failure-stage diagnostics active; negative/role matrix pending isolated identities |
| Dashboard / Needs Attention | command-centre renders; actionable links open correct records; no browser/server errors; transition timing | Route readiness active; record-specific actions pending fixtures |
| Customers | search; create; edit; validation; customer details remain visible after refresh | Search-input and blocked-empty-submit validation active; valid create/edit/delete pending isolated environment |
| Properties | search; customer association; create/edit; controlled property type; validation | Customer lookup and expandable-section interaction active; mutations pending isolated environment |
| Quotes | queue filters/search; quote detail; revision review; safe send/share controls; secure customer accept/decline exact revision | Office route readiness active; outbound correspondence and public capability mutation scenarios remain isolated-only |
| Work Orders | queue/search; create; edit; service/staffing selectors; status lifecycle; detail; assignment; repeated navigation timing | Route readiness + repeated navigation timing active; mutations pending isolated environment |
| Technician execution | assigned-job list; job start; checklist outcomes; exceptions; offline queue/reconcile; evidence/photo capture; review; Job Leader completion; correction; incident | Pending dedicated Technician identity + isolated job fixture |
| Execution Evidence / photos | select photo; immediate local preview; compressed local save; queued upload; acknowledged persistence; reload; private evidence visibility | Immediate selected-photo preview is implemented for Technician image inputs; persisted/reload verification remains pending an isolated Technician fixture |
| Crews | list/search; create/edit; leader/member choices; membership persistence | Route readiness active; mutations pending isolated environment |
| Shift Planning | week navigation; create/edit/copy/delete; crew/technician/work-order selectors; historical selected-value representability | Route readiness active; mutations pending isolated environment |
| Services | list/search; Admin create/edit/status; primary/add-on semantics | Route readiness active; mutations pending isolated environment |
| Cleaning Job Templates | list; create/edit; service association; checklist configuration | Route readiness active; mutations pending isolated environment |
| Recurring Services | list; create; pause/resume/cancel; generate; reference loading | Route readiness active; mutations pending isolated environment |
| Employee Records | list/search/status; controlled Business List values; create/edit | Route readiness active; mutations pending isolated environment |
| Profile | profile read; email change flow boundaries; profile-photo choose/crop/save/reload | Route readiness active; mutations pending isolated environment |
| Admin settings | Business Profile; Business Lists; Services; Service Scope Templates; User Access; Customer Data Cleanup | Main settings/service/scope readiness plus settings-destination availability active; deeper record-specific scenarios pending fixtures |
| Supervisor operations | Supervisor-only operational review and correction paths | Pending dedicated Supervisor identity |
| Messaging | conversation list; open conversation; guarded reply UI; WhatsApp Business operations | Route readiness active; real provider sends/templates/webhooks excluded from generic browser audit |
| Public/customer capability surfaces | secure Quote exchange/session; safe projection; accept/decline/idempotency | Pending isolated capability fixtures; capability values must never enter artifacts/logs |

## Safety boundary for mutations

The production-safe audit may target the deployed production OS because it does not intentionally create, edit, delete, send, complete, assign, upload, or change provider/business state. It may submit invalid/empty forms only where browser-native validation prevents a valid request from being sent, and it may issue ordinary read-only search requests.

A full mutation matrix must **not** be pointed at ordinary production data. Before mutation scenarios are enabled, HestivaOS needs an isolated browser-audit environment or tenant with disposable fixtures and dedicated identities for at least ADMIN, SUPERVISOR and TECHNICIAN roles. The environment must prevent external side effects such as customer correspondence, WhatsApp/Messenger sends, provider template operations, real customer capabilities, or production evidence uploads unless a specific provider smoke test is separately approved.

This is an execution-safety requirement, not a reason to split the audit into many architecture slices. The same Playwright matrix should gain mutation projects once the isolated fixture boundary exists.

## Performance evidence

The browser audit records elapsed milliseconds rather than asserting an arbitrary universal speed threshold. The first goal is to compare routes under the same run and identify outliers. Work Orders receives an explicit three-attempt client-transition sample because current operator observation says it remains a little slower after the server-first performance work.

The first complete timing artifact, from browser audit run #6 on 2026-08-30, established that Work Orders is a cold/direct-load outlier while warm client-side navigation is healthy. Desktop direct load was about 4.3 seconds and mobile about 4.1 seconds, while the desktop client transition was about 48 ms and three repeated Work Orders transitions were about 57/53/53 ms. This evidence points at route/data readiness rather than the persistent navigation shell. The consolidated cleanup therefore preserves the 100-item initial Work Order data contract but streams a route-level fallback while that data resolves instead of changing list semantics or reopening the navigation architecture.

Run #8 on merged PR #254 kept all route-readiness checks green. Dashboard cold-load evidence remained variable: desktop changed only slightly from run #7 while mobile improved materially. Because the browser audit intentionally measures deployed end-to-end behavior and the samples are not yet a stable benchmark, no further speculative Dashboard optimization is justified from that single comparison. Functional coverage is the next audit priority.

Performance findings must distinguish:

- client-shell transition time;
- server-rendered route/data time;
- browser/API failures;
- repeated/warm navigation behaviour.

A later threshold may be introduced only after representative runs establish a stable baseline. The browser audit must not create a noisy gate from an invented latency number.

## First-audit observations and resulting cleanup

The first deployed audit and operator review produced three bounded cleanup items:

- Technician job-photo selection now surfaces an immediate local preview before the existing compression, offline persistence and upload/reconcile path continues. This does not change evidence authority or storage behavior; persisted/reload verification remains part of the future isolated Technician scenario.
- The shared Homent burgundy tokens are lightened slightly through a final global tuning layer so the whole OS moves together rather than screen by screen.
- Work Orders keeps the same initial 100-record server data request and existing authorization behavior, but that data is now behind a Suspense fallback so a slow Railway-backed direct load does not leave the route visually frozen. Warm navigation was already healthy and is intentionally unchanged.

## Required GitHub Actions configuration

Repository secrets, values never committed:

- `HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL`
- `HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD`

The workflow requires a `base_url` input at dispatch time and exports it only as `HESTIVA_BROWSER_AUDIT_BASE_URL` for that run. Future isolated mutation coverage will add role-specific credentials/fixture identifiers only when the test-environment boundary is actually implemented.

## How to interpret a run

A failed route or read-only interaction scenario means the browser observed an actionable readiness failure such as an HTTP document error, a browser page exception, an HTTP 5xx response, authentication failure, missing authenticated shell, missing expected control, broken client interaction, or expected native validation not blocking an empty form. A green scenario proves only the behavior explicitly exercised; it does not prove every button on that screen works.

When authentication fails before navigation, the error reports only the safe stage evidence needed to distinguish cases such as a Supabase password request returning an HTTP error, a successful Supabase request followed by a failing HestivaOS `/users/sync` call, or a network/CORS failure before an HTTP response. The diagnostic intentionally does not inspect response bodies or expose request URLs, credentials, tokens, user data or browser storage.

The sanitized timing artifact is comparative evidence. It is not customer/business data and must remain that way. Do not add response bodies, screenshots, DOM snapshots, traces, tokens, message text, customer names, addresses, phone numbers or email content to the artifact.

## Next operational sequence

1. Keep the deployed browser audit production-safe while expanding bounded read-only interaction coverage where controls can be exercised without changing business state.
2. Use failures from those interactions to define focused fixes rather than speculative page rewrites.
3. Establish the isolated mutation fixture boundary, then enable valid create/edit/delete/lifecycle, Technician, Supervisor, provider-safe and customer-capability journeys inside this same audit system.
