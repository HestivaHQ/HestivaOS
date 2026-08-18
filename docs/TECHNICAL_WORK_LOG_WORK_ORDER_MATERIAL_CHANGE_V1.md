# Technical Work Log — Work Order Material Change v1

## 2026-08-18 — Phase 2A controlled material Work Order changes

Implemented the first Phase 2 Work Order operational-control slice from Issue #127 / Issue #73 Decisions 72–73.

### Runtime

- Added lifecycle-derived material-change classification so restrictions depend on authoritative Work Order state rather than an invented hours-before-service cutoff.
- Added ADMIN-only consequence preview with optimistic `updatedAt` concurrency protection.
- Added append-only `work_order_material_changes` migration/history with stable operation UUID, request hash, actor, stage, previous snapshot, requested changes, consequence snapshot, reason/override reason and commit timestamp.
- Added serializable, retry-aware material-change commit behavior with identical-operation recovery and conflicting operation-ID rejection.
- Added Customer/Property ownership validation, primary Service/add-on availability validation, exact add-on quantity handling and Laundry/Ironing capacity-approval enforcement.
- Added confirmed generic-edit/cancellation bypass protection while leaving `NEW` pending Work Orders on the ordinary edit path.
- Added read access to material-change history for authorized operational management roles.
- Preserved existing cancellation status/activity history when cancellation is committed through the controlled workflow.

### Web

- Added an ADMIN-only Work Order detail panel using controlled Customer, Property, Service, frequency, home-condition and add-on selections plus scheduling/cancellation controls.
- Added explicit Review Consequences → Apply Reviewed Change flow.
- Added required imminent-change override-reason UX and visible Finance/Customer Correspondence integration boundaries.
- Added material-change history presentation.

### Tests and validation

- Added policy coverage for lifecycle stage mapping, material-field classification, imminent override requirements, in-progress/historical fail-closed behavior and completion-history protection.
- Added web source-contract coverage for dedicated preview/commit/history endpoints, Admin-only presentation, consequence-first UX and controlled selectors.
- Draft PR quality gates are used during implementation; the merge-ready exact head must pass the complete repository verification and both PostgreSQL replay modes.

### Preserved/deferred

- No Technician execution-scope rewrite, payment decision, refund/credit behavior, direct customer correspondence, Access readiness workflow, scope-mismatch/additional-work workflow, interrupted-visit outcome or replacement-visit workflow is introduced here.
- Phase 2B–2D remain tracked under Issue #127.
