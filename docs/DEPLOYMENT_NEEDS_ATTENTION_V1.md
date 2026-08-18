# Needs Attention Foundation v1 deployment

## Scope

Phase 1 adds the shared Dashboard Needs Attention persistence and API/UI foundation through additive migration `20260818210000_needs_attention_foundation`. It creates attention lifecycle/activity enums and tables, ownership/seen/audit relationships, indexes, and the unique `condition_key` identity used to prevent duplicate live occurrences. It does not rewrite Work Orders, create historical attention rows during migration, send correspondence, add credentials, or change Cloudflare/Railway deployment authority.

## Deployment order

1. Require the exact PR head to pass the repository quality gates, including both PostgreSQL migration replays, typecheck, build, tests, documentation validation, secret scan, and whitespace validation.
2. Merge only that verified head to `main`.
3. Railway applies the additive Prisma migration through the existing `npm run deploy:api` migration-before-start boundary and then starts the API.
4. Cloudflare native Git builds and deploys the matching web revision through the existing single frontend deployment authority.
5. No new environment variable or secret is required.

## Post-deploy verification

Use an authenticated operational user and verify:

- `/api/v1/attention?view=mine` and `?view=all` return only queues visible to the caller's role;
- a Work Order scheduled today with no Crew and no normalized Technician assignment produces one High Operations item;
- an unresolved Work Order scheduled before the Johannesburg business day produces one Critical Operations item;
- a completed field job with accepted completion and no management acknowledgement produces one Normal Management Review item;
- repeated reads do not duplicate the same condition;
- Mark Seen records acknowledgement without resolving the item;
- eligible owner assignment persists and an inactive/ineligible owner is returned to the queue on reconciliation;
- correcting the underlying Work Order condition auto-resolves the item; if the same condition later returns, the same durable identity reopens with incremented occurrence history;
- Dashboard order remains Needs Attention, Today's Work, Shortcuts, Upcoming and each item deep-links to its authoritative Work Order.

## Rollback

Application rollback should leave the additive attention tables/enums in place. A prior application does not depend on them, and dropping the tables would discard lifecycle/audit history. If the new Dashboard/API revision is faulty, redeploy the last known-good API/web revisions after checking migration compatibility. Database rollback is a separately reviewed operation and must not delete attention history merely to restore the application.
