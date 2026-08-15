# Website Integration Secret Drift Guard

## Purpose

A production Website Quote outage on 2026-08-15 was traced to credential drift between the Website Cloudflare runtime and the HestivaOS Railway runtime. Requests reached `POST /api/v1/integrations/website/quotes` but HestivaOS returned HTTP 401 until the Cloudflare `HESTIVA_WEBSITE_INTEGRATION_SECRET` was reset to the canonical Railway value.

## Guardrails

- Railway remains the operational source of truth for `HESTIVA_WEBSITE_INTEGRATION_SECRET`.
- Secret rotation is a coordinated two-runtime operation: set Railway first, copy the exact same value to Cloudflare, then redeploy/restart both runtimes as required.
- HestivaOS exposes authenticated `GET /api/v1/integrations/website/health`. It uses the same Bearer-secret verifier as Website Quote ingestion and does not touch customer, Quote, pricing, or database state.
- A successful health response returns `ok: true`, `integration: "website"`, and a 12-character SHA-256 fingerprint of the configured secret.
- HestivaOS startup logs include the same safe fingerprint. The secret itself is never logged or returned.
- The fingerprint is a diagnostic identifier only. It is not an authentication credential and must not replace the integration secret.

## Production verification after any secret or deployment change

1. Confirm Railway has the intended canonical `HESTIVA_WEBSITE_INTEGRATION_SECRET`.
2. Copy that exact value into the Website Cloudflare secret binding.
3. Allow both runtimes to deploy/restart.
4. Call the authenticated integration-health endpoint using the same Bearer value.
5. Require HTTP 200 before declaring the Website → HestivaOS integration healthy.
6. If the health call returns 401, do not change Quote business logic. Reconcile the two runtime secret bindings first.

## Preserved boundaries

This guard introduces no new credential, database table, background job, monitoring service, pricing behavior, Quote acceptance rule, or customer-data flow. Existing Quote ingestion remains fail closed on invalid credentials.
