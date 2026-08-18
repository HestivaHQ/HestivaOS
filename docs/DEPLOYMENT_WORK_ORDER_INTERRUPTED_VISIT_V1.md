# Deployment — Work Order Interrupted Visit v1

Date: 2026-08-18
Scope: Phase 2C.

## Database change

Apply migration `20260818224500_interrupted_work_order_visit` before serving API traffic that records interruptions.

The migration is additive. It extends the Work Order and Needs Attention enums and creates append-only `work_order_interruptions` and `work_order_interruption_routes` audit tables with operation-ID idempotency and restrictive relationships. Existing completion, scope, Finance and Correspondence history is not rewritten.

## Deployment order

1. Apply the PostgreSQL migration.
2. Deploy the API containing Technician interruption and management routing endpoints.
3. Deploy the web application containing the Technician local-first interruption UI and Admin/Supervisor review UI.
4. Verify a Job Leader can record an interruption from an eligible active visit and the Work Order becomes `INTERRUPTED`.
5. Verify the Needs Attention item opens and a safety interruption is Critical.
6. Verify a non-leader Technician cannot record the interruption.
7. Verify management routing does not rewrite the original attempted visit; `CLOSE` alone closes it in this slice.
8. Verify replacement and financial-review routes create no replacement Work Order or financial transaction in Phase 2C.

## Required checks

Run the standard repository quality gates on the exact PR head: clean and staged PostgreSQL migration replay, Prisma generation, documentation validation, secret scan, workspace typecheck/build/tests, independent API/web builds, Cloudflare types, OpenNext/Wrangler validation, and whitespace checks.

## Rollback

Application rollback is safe because the new tables are additive and existing Work Orders do not require interruption records. Do not drop interruption tables during a normal application rollback because they contain operational audit history. Do not coerce existing `INTERRUPTED` Work Orders to another lifecycle state merely to run older application code; restore application compatibility or perform an explicitly reviewed data migration instead.
