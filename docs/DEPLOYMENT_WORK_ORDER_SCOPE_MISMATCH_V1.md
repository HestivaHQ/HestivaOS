# Deployment — Work Order Scope Mismatch v1

Date: 2026-08-18
Scope: Phase 2B.

## Database change

Apply migration `20260818202500_work_order_scope_mismatch_resolution` before serving API traffic that writes management resolutions.

The migration is additive. It creates `work_order_scope_mismatch_resolutions`, a unique operation-ID index, a Work Order/outcome-event history index, controlled check constraints, and restrictive foreign keys to Work Orders, execution outcome events and Users. No existing Technician outcome, Work Order, Quote, Finance or Correspondence data is rewritten.

## Deployment order

1. Deploy the database migration.
2. Deploy the API containing the management list/resolve endpoints.
3. Deploy the web Admin scope-mismatch panel.
4. Verify an existing `SCOPE_OR_CONDITION_MISMATCH` event can be listed.
5. Record a non-chargeable test resolution and verify it appears in history.
6. Verify chargeable work remains blocked until capacity review plus recorded customer approval.

## Required checks

Run the standard repository quality gates, including clean and staged PostgreSQL migration replay, Prisma generation, documentation validation, secret scan, typecheck, builds, tests, OpenNext/Wrangler validation and whitespace checks.

## Rollback

Application rollback is safe because the migration is additive and existing field execution does not depend on management resolution writes. Do not drop the table during an application rollback because it contains append-only operational audit history. A destructive schema rollback requires an explicit data-retention decision and is not part of normal rollback.
