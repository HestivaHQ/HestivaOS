# Work Order Material Change v1 deployment

## Scope

Phase 2A adds the controlled material-change API/UI and additive migration `20260818223000_work_order_material_changes`. The migration creates append-only audit history only; it does not backfill or rewrite Work Orders, execution scopes, Quote history, payment state, or customer correspondence.

## Deployment order

1. Require the exact PR head to pass documentation validation, secret scan, typecheck, build, tests, independent API/web builds, Cloudflare/OpenNext/Wrangler validation, whitespace validation, and both PostgreSQL migration replays.
2. Merge only that verified head to `main`.
3. Railway applies the additive migration through the existing `npm run deploy:api` migration-before-start boundary.
4. Cloudflare native Git builds the matching frontend revision.
5. No new environment variable, provider credential, queue, scheduled job, or deployment authority is introduced.

## Post-deploy verification

With an ADMIN account and disposable/non-production-sensitive test Work Orders, verify:

- a `NEW` Work Order still supports ordinary pending edits;
- an `ASSIGNED` Work Order material edit requires the controlled preview/commit path but no override reason;
- `ACCEPTED` / `TRAVELLING` preview reports `IMMINENT` and commit requires an override reason;
- `ON_SITE` / `WAITING_FOR_PARTS` material changes are blocked and preserve frozen/booked scope;
- `COMPLETED`, `CLOSED`, and `CANCELLED` material rewrites are blocked;
- stale `expectedUpdatedAt` fails closed;
- retrying the same `operationId` and request recovers the existing audit record without a second mutation;
- reusing an `operationId` for different content is rejected;
- Customer/Property mismatch and inactive/new Service/add-on violations are rejected;
- Laundry/Ironing add-on placement requires explicit capacity approval;
- confirmed cancellation records normal Work Order cancellation/status activity plus material-change history;
- no email, WhatsApp, SMS, Messenger, payment, refund, or credit side effect occurs.

## Rollback

Application rollback should leave `work_order_material_changes` in place. Dropping the table would discard append-only operational audit history. Before rolling back application code, confirm the prior revision does not attempt confirmed material edits that would conflict with operational procedures established after rollout. Database rollback is a separately reviewed operation and must not delete recorded material-change history merely to simplify application rollback.
