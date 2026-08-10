# Browser-to-API connectivity audit

## Status and evidence boundary

**Status: DIAGNOSED; no implementation fix is justified from repository evidence alone.** This audit reflects commit `bba27e0` (the merge of PR #57) and the production observations supplied with the incident: Employee Records' migration and route registration succeeded, `OPTIONS /api/v1/employees` returned 204 without a following GET, and `POST /api/v1/users/sync` reached Railway with 201. The repository does not contain Railway's deployed environment values, Cloudflare's deployed build-variable values, browser response headers, or platform logs. Consequently it cannot prove which production origin or API URL is currently deployed.

The confirmed failure is the observed Employee Records browser request. Every other client module is **exposed to the same failure class**, but is not confirmed failed. The successful user sync is a confirmed working server-side path for the observed test, not proof that browser CORS works.

## Request architecture

`lib/api.ts` is the only Hestiva API fetch implementation. It normalizes the selected base URL, appends `/api/v1`, always adds `Content-Type: application/json`, and, in a browser, obtains the current Supabase session and adds `Authorization: Bearer ...` when the caller did not supply it. It uses Fetch's defaults: no `credentials: 'include'` and therefore `credentials: 'same-origin'`. It does not catch transport errors, so browser Fetch's native `TypeError` message (commonly `Failed to fetch`) reaches each client manager, which displays `error.message`.

The base URL selection is runtime-sensitive:

- Next.js server calls select `API_URL`, falling back to `NEXT_PUBLIC_API_URL`, then local development.
- Client bundles can use the build-time `NEXT_PUBLIC_API_URL`; changing a Worker runtime variable cannot repair an already-built client bundle.
- `createAuthenticatedApi()` is the server-only wrapper. It reads the Supabase session server-side and supplies the bearer token to `api`.
- There is no `authenticatedFetch`, Axios, XMLHttpRequest, second Hestiva API helper, or direct Hestiva API `fetch` elsewhere. Direct fetches in the API process call Supabase Auth/health and are not browser-to-Railway requests. Browser Supabase Auth and Storage calls use the Supabase SDK and are outside the Railway CORS policy.

## Verified request inventory

All rows marked "browser" are cross-origin when `NEXT_PUBLIC_API_URL` is Railway. `JSON` means the shared helper's unconditional `Content-Type: application/json`. `Bearer (auto)` means the helper adds the current session token in the browser. Those two non-safelisted headers make preflight expected for **every browser row, including GET and DELETE**. Current CORS compatibility is `conditional`: methods and headers match PR #57's policy, but the exact browser origin must exist in the deployed Railway allowlist and the built browser API URL must be correct.

| Module | Page/route | API endpoint(s) and methods | Origin / implementation | Auth / custom headers | Preflight | CORS / raw-error exposure |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/` | `POST /users/sync`; `GET /dashboard` | Next.js server / `createAuthenticatedApi` -> shared helper | Bearer; JSON | No | CORS N/A; sync failure is fatal, dashboard failure renders an empty state |
| Customers | `/customers` | `POST /users/sync` server; `GET,POST /customers`; `PATCH,DELETE /customers/:id` browser | Mixed; server wrapper plus client shared helper | Server bearer; browser Bearer (auto), JSON | Browser: yes | Conditional; client displays raw message |
| Properties | `/properties` | `GET /properties,/customers`; `POST /properties`; `PATCH,DELETE /properties/:id` | Browser / shared helper | Bearer (auto), JSON | Yes | Conditional; raw message exposed |
| Services | `/services` | `GET,POST /services`; `PATCH,DELETE /services/:id` | Browser / shared helper | Bearer (auto), JSON | Yes | Conditional; raw message exposed |
| Cleaning job templates | `/cleaning-job-templates` | `GET,POST /cleaning-job-templates`; `PATCH,DELETE /cleaning-job-templates/:id`; `GET /services` | Browser / shared helper | Bearer (auto), JSON | Yes | Conditional; raw message exposed |
| Technicians | `/technicians` | `GET,POST /technicians`; `PATCH,DELETE /technicians/:id` | Browser / shared helper | Bearer (auto), JSON | Yes | Conditional; raw message exposed |
| Employee Records | `/employees` | `POST /users/sync` server; `GET,POST /employees`; `PATCH /employees/:id` browser | Mixed; server wrapper plus client shared helper | Bearer; JSON | Browser: yes | Conditional; **confirmed exposed**; ADMIN checks remain server/API enforced |
| Crews | `/crews` | `GET,POST /crews`; `PATCH,DELETE /crews/:id`; `GET /technicians` | Browser / shared helper | Bearer (auto), JSON | Yes | Conditional; raw message exposed |
| Shift Planning | `/shifts` | `GET,POST /shifts`; `PATCH,DELETE /shifts/:id`; `POST /shifts/:id/copy`; reference GETs for crews, technicians, work orders | Browser / shared helper | Bearer (auto), JSON | Yes | Conditional; raw message exposed |
| Work Orders | `/work-orders` | `POST /users/sync` server; browser CRUD for `/work-orders`, `PATCH /:id/status`, timeline/checklist endpoints, and reference GETs | Mixed; server wrapper plus client shared helper | Bearer; JSON | Browser: yes | Conditional; raw message exposed |
| Technician job | `/work-orders/:id` | `GET /work-orders/:id`; status, checklist, photo and customer-sign-off GET/POST/PATCH/DELETE endpoints | Browser / shared helper; Supabase SDK separately handles photo bytes | Bearer (auto), JSON | Yes | Conditional; API and Storage messages exposed |
| My Profile | `/profile` | `POST /users/sync` server; `PATCH /users/me/profile` browser | Mixed; server wrapper plus client shared helper | Bearer; JSON | Browser: yes | Conditional; raw message exposed |
| Admin Settings | `/admin/settings` | `POST /users/sync` | Next.js server / server wrapper | Bearer; JSON | No | CORS N/A; server-render failure |
| User Access | `/admin/settings/user-access` | `POST /users/sync`, `GET /users/admin` server; `PATCH /users/:id/role`, `/access` browser | Mixed; server wrapper plus client shared helper | Bearer; JSON | Browser: yes | Conditional; raw message exposed; ADMIN/API access checks retained |
| Business Profile | `/admin/settings/business-profile` | `POST /users/sync`, `GET /admin/business-profile` server; `PATCH /admin/business-profile` browser | Mixed; server wrapper plus client shared helper | Bearer; JSON | Browser: yes | Conditional; raw message exposed; ADMIN/API access checks retained |
| Authentication | `/login`, `/auth/confirm`, middleware | Supabase Auth SDK only; authenticated pages later call `POST /users/sync` | Browser/server to Supabase; sync is Next.js server via server wrapper | Supabase SDK; sync bearer and JSON | Railway sync: no | Supabase policy is separate; server sync confirmed reached Railway |

There is no standalone production route for a separate "Admin Dashboard" in current code; `/` is the dashboard. The navigation also has no separate Management API page.

## Working versus failing comparison

### `POST /api/v1/users/sync`

Authenticated pages call sync while rendering on the Cloudflare/OpenNext Next.js server. `createAuthenticatedApi()` reads the server session and calls the shared helper with an explicit bearer token. The server uses `API_URL`; the browser CORS algorithm does not apply, so there is no browser preflight. A Railway 201 proves server-to-API URL reachability, bearer verification, and that route for that request.

### `GET /api/v1/employees`

After the server has synced the user and authorized the page, `EmployeesManager` loads records in the browser. The client bundle uses `NEXT_PUBLIC_API_URL`; the shared helper adds both `Authorization` and `Content-Type`. Cross-origin Fetch therefore preflights. A 204 alone is not success: the response must include `Access-Control-Allow-Origin` equal to the browser's exact origin, allow GET, and allow both requested headers. If that validation fails, the browser withholds GET and rejects Fetch with a network `TypeError`, matching the observed sequence.

**Critical difference:** sync is server-side and bypasses browser CORS; employees is browser-side and depends on both build-time browser URL configuration and Railway CORS. They use the same core helper but different runtime URL branches.

## CORS before and after PR #57

Before PR #57, API startup split `CORS_ALLOWED_ORIGINS` on commas without trimming whitespace or trailing slashes, retained `credentials: true`, and let the Nest/Express CORS package supply its default advertised methods and reflect requested headers. A value such as `https://one.example, https://two.example/` could fail exact matching for the second origin. That defect predates Employee Records and could affect every browser module. The old default methods covered the repository's methods and reflected the requested `Authorization` and `Content-Type`, so no omitted in-repository method/header is established.

PR #57 trims whitespace, strips one or more trailing slashes, removes empty entries, explicitly advertises `GET, HEAD, PUT, PATCH, POST, DELETE` and `Authorization, Content-Type`, and retains explicit origins plus credentials. It is stricter than the previous reflected-header behavior for any unlisted future/custom header, but repository search found none. It is not more restrictive for current methods. No evidence proves that PR #57 caused a regression; it partially improves a pre-existing configuration-sensitivity defect. **Assessment: KEEP; do not revert.**

Current parsing behavior is exact:

- Undefined: defaults only to `http://localhost:3000`.
- Empty string, commas, or whitespace only: normalizes to an empty list, so all origins are denied; it does not fall back to localhost.
- Multiple entries: comma-separated, individually trimmed, trailing `/` characters removed, empty entries discarded.
- Matching: exact scheme, hostname, and port. Paths other than removable trailing slashes are not valid origins and are not otherwise normalized. No wildcard, regex, dynamic preview rule, custom production domain, or `workers.dev` hostname is built in.
- The current production/preview origin cannot be inferred from source. If the active browser origin is `https://hestivaos.patient-disk-0b26.workers.dev`, Railway's deployed `CORS_ALLOWED_ORIGINS` must contain that exact origin (without a path; a trailing slash is harmless after PR #57). Every separately approved custom-domain or preview origin must also be an explicit comma-separated entry. Do not hard-code platform hostnames in application code.
- `credentials: true` causes an approved response to name the origin rather than use `*`. Current Hestiva API fetches do not set `credentials: 'include'` and authentication is bearer-based, so credentialed cross-origin cookies are not evidenced as necessary. Retaining the setting is safe and avoids changing an unverified historical contract.

## Environment and legacy audit

- `API_URL` is the Cloudflare Worker/server runtime API base. The checked-in Wrangler binding points to the current Railway endpoint documented by the repository.
- `NEXT_PUBLIC_API_URL` is the Cloudflare **build-time** browser API base. Its deployed value is not tracked; it must identify the same intended API service. The helper safely removes trailing slashes and one terminal `/api/v1`, preventing duplicate prefixes.
- `CORS_ALLOWED_ORIGINS` is Railway runtime configuration and is not tracked. It must list every approved origin that directly makes browser API calls.
- No active Maintenance Marshall URL was found in auth or CORS configuration. The checked-in Railway hostname contains the acknowledged legacy `mmapi` label. That is a naming remnant, not evidence of a wrong endpoint; migration is already separately planned.
- Cloudflare production and preview origins can differ. The current exact-origin allowlist cannot automatically admit arbitrary preview deployments; each approved preview origin requires an entry or a separately reviewed origin-matching policy.

## Root-cause finding

1. **Confirmed mechanics, runtime cause not yet provable:** the Employee Records GET stopping after OPTIONS means browser preflight validation failed or the browser otherwise aborted between preflight and GET. The server-side sync success does not test CORS. Repository code after PR #57 has compatible methods and headers, leaving deployed exact-origin configuration and the preflight response as the leading runtime checks. The absent production environment and response headers prevent claiming a specific missing value as confirmed.
2. **Confirmed systemic exposure:** all browser Hestiva API calls preflight because the shared helper adds JSON content type and bearer authentication, and all client managers surface raw Fetch messages. Thus one deployed origin/API connectivity defect can present as `Failed to fetch` across modules. This exposure predates PR #57.

No code, configuration, architecture, database, authorization, dependency, or error-handling change is made by this diagnostic. Tests were not added because the current code already tests the confirmed normalization/header contract and no additional repository defect was established.

## Exact runtime verification

1. In the affected browser deployment, record `window.location.origin` and inspect the failing request URL. Confirm the URL is the intended Railway base plus `/api/v1/...`; do not copy tokens.
2. In Cloudflare's production build settings, verify `NEXT_PUBLIC_API_URL` names that Railway API, then verify the deployed artifact was rebuilt after its last change. In Worker runtime settings, verify `API_URL` identifies the same service for server calls.
3. In Railway, inspect the variable by name and confirm `CORS_ALLOWED_ORIGINS` contains the exact value from step 1. For the cited Worker, the required entry is `https://hestivaos.patient-disk-0b26.workers.dev`. Add other approved production/custom/preview origins as comma-separated exact origins. Restart the API after a variable change.
4. From browser DevTools, repeat Employee Records. The OPTIONS response must be 204 and include the exact `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` containing GET, and `Access-Control-Allow-Headers` containing Authorization and Content-Type. `Access-Control-Allow-Credentials: true` is expected under the retained policy.
5. Railway network/application logs should show correlated `OPTIONS /api/v1/employees 204` followed immediately by `GET /api/v1/employees` (normally 200 for an authorized ADMIN). If OPTIONS appears without GET, capture its response headers and the browser console CORS reason. If neither appears, diagnose the built URL, DNS/TLS, Cloudflare, or client cancellation. If GET appears, CORS allowed dispatch and the status/body becomes the next diagnostic boundary.
6. In the same session compare a page navigation that performs server-side `/api/v1/users/sync` with one browser module request. Do not treat a sync 201 as a browser connectivity check.

**Recommended next action:** verify and, only if necessary, correct Railway's deployed `CORS_ALLOWED_ORIGINS` against the exact active `window.location.origin`, then capture the complete OPTIONS response and confirm Railway logs show the following GET. Do not merge or deploy a networking code change without that evidence.
