# Deployment — Work Order Replacement Visit v1

Phase 2D adds the `work_order_replacement_visits` table and new Work Order interruption replacement endpoints/UI. Deploy through the normal repository pipeline after the exact PR head passes clean and staged PostgreSQL migration replay, typecheck, builds, tests, OpenNext, Wrangler dry-run and whitespace validation.

The migration is additive. It does not rewrite existing Work Orders or interruption rows. Application deployment must follow successful database migration because the replacement service expects the provenance table to exist.

Post-deploy smoke checks:
- an interrupted Work Order routed to Replacement Visit can create one new linked Work Order;
- retrying the same operation UUID is idempotent;
- a second distinct replacement attempt is rejected;
- the original Work Order remains `INTERRUPTED` with its original schedule/history;
- the replacement starts `NEW`, unassigned and has a fresh `WO-...` reference;
- the interruption Needs Attention item resolves only after replacement creation;
- no financial or customer-correspondence state is created.
