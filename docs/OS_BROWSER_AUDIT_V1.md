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

The current V1 executable matrix is intentionally read-only and production-compatible. It:

- signs in through the real login UI;
- verifies authenticated shell readiness;
- opens the primary and important secondary/admin routes on desktop and mobile Chromium;
- fails on document HTTP errors, browser page exceptions, or HTTP 5xx responses observed during a route check;
- samples desktop client-side navigation timing across the primary shell;
- samples Work Orders navigation three times independently because Work Orders has been observed to feel slightly slower than neighbouring routes;
- writes only a sanitized JSON timing summary containing route names, route paths, project name and elapsed milliseconds.

No screenshots, videos, Playwright traces, storage-state files, customer payloads, browser console dumps, access tokens or credentials are uploaded as workflow artifacts. Authentication state is ephemeral runner data under `.playwright/` and is git-ignored.

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

## Full functional scenario map

The long-term audit is one coordinated system, not a sequence of independent ad-hoc page tests. Scenarios are grouped by business journey so a failure identifies the broken boundary.

| Journey | Representative browser scenarios | V1 execution state |
| --- | --- | --- |
| Authentication and access | valid sign-in; invalid sign-in; protected-route redirect; role-visible navigation; inactive/unauthorised access | Valid ADMIN sign-in + protected route access active; negative/role matrix pending isolated identities |
| Dashboard / Needs Attention | command-centre renders; actionable links open correct records; no browser/server errors; transition timing | Route readiness active; record-specific actions pending fixtures |
| Customers | search; create; edit; validation; customer details remain visible after refresh | Route readiness active; mutation scenarios pending isolated environment |
| Properties | search; customer association; create/edit; controlled property type; validation | Route readiness active; mutation scenarios pending isolated environment |
| Quotes | queue filters/search; quote detail; revision review; safe send/share controls; secure customer accept/decline exact revision | Office route readiness active; outbound correspondence and public capability mutation scenarios remain isolated-only |
| Work Orders | queue/search; create; edit; service/staffing selectors; status lifecycle; detail; assignment; repeated navigation timing | Route readiness + repeated navigation timing active; mutations pending isolated environment |
| Technician execution | assigned-job list; job start; checklist outcomes; exceptions; offline queue/reconcile; evidence/photo capture; review; Job Leader completion; correction; incident | Pending dedicated Technician identity + isolated job fixture |
| Execution Evidence / photos | select photo; immediate local preview; compressed local save; queued upload; acknowledged persistence; reload; private evidence visibility | Pending isolated Technician fixture. Immediate preview is a known live observation to verify and currently has no explicit preview implementation in the capture path |
| Crews | list/search; create/edit; leader/member choices; membership persistence | Route readiness active; mutations pending isolated environment |
| Shift Planning | week navigation; create/edit/copy/delete; crew/technician/work-order selectors; historical selected-value representability | Route readiness active; mutations pending isolated environment |
| Services | list/search; Admin create/edit/status; primary/add-on semantics | Route readiness active; mutations pending isolated environment |
| Cleaning Job Templates | list; create/edit; service association; checklist configuration | Route readiness active; mutations pending isolated environment |
| Recurring Services | list; create; pause/resume/cancel; generate; reference loading | Route readiness active; mutations pending isolated environment |
| Employee Records | list/search/status; controlled Business List values; create/edit | Route readiness active; mutations pending isolated environment |
| Profile | profile read; email change flow boundaries; profile-photo choose/crop/save/reload | Route readiness active; mutations pending isolated environment |
| Admin settings | Business Profile; Business Lists; Services; Service Scope Templates; User Access; Customer Data Cleanup | Main settings/service/scope readiness active; deeper record-specific scenarios pending fixtures |
| Supervisor operations | Supervisor-only operational review and correction paths | Pending dedicated Supervisor identity |
| Messaging | conversation list; open conversation; guarded reply UI; WhatsApp Business operations | Route readiness active; real provider sends/templates/webhooks excluded from generic browser audit |
| Public/customer capability surfaces | secure Quote exchange/session; safe projection; accept/decline/idempotency | Pending isolated capability fixtures; capability values must never enter artifacts/logs |

## Safety boundary for mutations

The read-only V1 audit may target the deployed production OS because it does not intentionally create, edit, delete, send, complete, assign, upload, or change provider/business state.

A full mutation matrix must **not** be pointed at ordinary production data. Before mutation scenarios are enabled, HestivaOS needs an isolated browser-audit environment or tenant with disposable fixtures and dedicated identities for at least ADMIN, SUPERVISOR and TECHNICIAN roles. The environment must prevent external side effects such as customer correspondence, WhatsApp/Messenger sends, provider template operations, real customer capabilities, or production evidence uploads unless a specific provider smoke test is separately approved.

This is an execution-safety requirement, not a reason to split the audit into many architecture slices. The same Playwright matrix should gain mutation projects once the isolated fixture boundary exists.

## Performance evidence

The browser audit records elapsed milliseconds rather than asserting an arbitrary universal speed threshold. The first goal is to compare routes under the same run and identify outliers. Work Orders receives an explicit three-attempt client-transition sample because current operator observation says it remains a little slower after the server-first performance work.

Performance findings must distinguish:

- client-shell transition time;
- server-rendered route/data time;
- browser/API failures;
- repeated/warm navigation behaviour.

A later threshold may be introduced only after representative runs establish a stable baseline. The browser audit must not create a noisy gate from an invented latency number.

## Known operator observations entering the first audit

These are observations to verify, not assumptions that the audit has already diagnosed their root causes:

- Technician job-photo capture currently gives save/upload feedback but no visible selected-photo preview before/after local save; this should become a required evidence scenario when the Technician fixture is available.
- The current system-wide burgundy is visually darker than desired. This is a design-token adjustment to evaluate after the functional audit so the whole OS can be changed once rather than screen by screen.
- Work Orders feels slightly slower than neighbouring operational routes. V1 records repeated Work Orders client-transition timing so the next cleanup can use evidence rather than another speculative performance slice.

## Required GitHub Actions configuration

Repository secrets, values never committed:

- `HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL`
- `HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD`

The workflow requires a `base_url` input at dispatch time and exports it only as `HESTIVA_BROWSER_AUDIT_BASE_URL` for that run. Future isolated mutation coverage will add role-specific credentials/fixture identifiers only when the test-environment boundary is actually implemented.

## How to interpret a run

A failed route scenario means the browser observed an actionable readiness failure such as an HTTP document error, a browser page exception, an HTTP 5xx response, authentication failure, or missing authenticated shell. A green route scenario proves only that the route opened cleanly for that identity; it does not prove every button on that screen works.

The sanitized timing artifact is comparative evidence. It is not customer/business data and must remain that way. Do not add response bodies, screenshots, DOM snapshots, traces, tokens, message text, customer names, addresses, phone numbers or email content to the artifact.

## Next operational sequence

1. Merge the browser-audit foundation only after normal PR quality gates pass.
2. Configure the dedicated GitHub Actions browser-audit ADMIN credentials.
3. Run the read-only matrix against the intended deployed origin and collect the first timing/failure report.
4. Use that report together with the already observed photo-preview, burgundy and Work Orders issues to define **one consolidated OS cleanup**, rather than reopening page-by-page speculative slices.
5. Establish the isolated mutation fixture boundary, then enable the remaining business-journey scenarios inside this same audit system.
