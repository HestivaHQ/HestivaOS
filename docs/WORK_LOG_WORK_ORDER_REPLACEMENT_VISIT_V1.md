# Technical Work Log — Work Order Replacement Visit v1

Date: 2026-08-18
Coordination: Issue #127

Implemented Phase 2D linked replacement visits on top of the canonical Phase 2C `INTERRUPTED` Work Order state.

Key changes:
- additive `work_order_replacement_visits` provenance table;
- stable operation UUID idempotency and one-replacement-per-interruption constraint;
- Admin/Supervisor replacement creation endpoint gated by the latest `REPLACEMENT_VISIT` management route;
- new Work Order with fresh daily reference, `NEW` status and no Technician/crew assignment;
- carry-forward of customer/property/service/add-ons, recurring-agreement association and non-secret visit context;
- explicit non-copying of execution outcomes/evidence, frozen scope revisions, temporary access credentials, completion/interruption state and customer correspondence state;
- interruption Needs Attention resolution only after the replacement exists;
- guided management UI and direct link to the replacement Work Order;
- backend/frontend regression coverage;
- ADR-0057, deployment and recovery notes.

Finance remained untouched by design.
