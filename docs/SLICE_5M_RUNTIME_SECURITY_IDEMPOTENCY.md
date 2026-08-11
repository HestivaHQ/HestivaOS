# Slice 5M runtime security and idempotency foundation

**Status:** implementation support only; no ingestion route is exposed by this change.

This focused sub-slice adds two API-side primitives required before the private Website → HestivaOS Quote ingestion route can be safely implemented.

## Server-to-server bearer verification

`apps/api/src/quotes/website-integration-auth.ts` verifies the approved `Authorization: Bearer ...` boundary against the server-side `HESTIVA_WEBSITE_INTEGRATION_SECRET` value. Missing configuration, missing/malformed headers, and non-exact values fail closed. Both candidate and configured secret are first reduced to fixed-length SHA-256 digests, then compared with Node's constant-time comparison primitive.

The helper is not wired to a controller in this sub-slice. No integration secret is created, committed, exposed to the browser, or added to deployment configuration here.

## Idempotency fingerprint

`apps/api/src/quotes/website-quote-idempotency.ts` produces a SHA-256 fingerprint of the complete structured submission after recursively sorting object keys while preserving array order. This makes equivalent JSON object serialization stable without making assumptions that selected-item array order is interchangeable.

The later ingestion transaction can persist/compare this fingerprint (or equivalently compare the same canonical material) when enforcing the approved rule: the same `submissionId` and same material submission replays the existing Quote, while the same identity with materially different content conflicts and creates nothing new.

## Scope boundary

This sub-slice does **not** expose `POST /api/integrations/website/quotes`, persist a fingerprint, calculate pricing, transfer photos, create Quote records, add environment values, or alter production deployment. Those remain protected runtime work and must not be inferred as implemented from these helpers.
