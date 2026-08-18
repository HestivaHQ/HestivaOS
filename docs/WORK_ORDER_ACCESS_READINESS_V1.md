# Work Order Access Readiness v1

Status: implemented Phase 3A foundation on 2026-08-18. Phase 3B protected credential handling, Phase 3C appointment-relative escalation, Phase 3D messaging recovery, and Finance are not implemented here.

## Canonical model

`WorkOrder.accessReadiness` is visit-specific operational state and is independent of `WorkOrder.status`. Its controlled values are `REQUIRED_MISSING`, `RECEIVED`, `NEEDS_REVIEW`, `EXPIRED`, `ARRANGED_ANOTHER_WAY`, and `NOT_REQUIRED`. Stable access facts and instructions remain on Property; temporary credential records remain Work Order scoped and are neither read nor written by this foundation.

Every effective readiness change appends a `WorkOrderAccessReadinessEvent` with old/new state, actor, and time, and also adds a state-only Work Order activity. ADMIN and SUPERVISOR may read history and change state through the constrained Work Order panel and protected API. Repeating the current state is a no-op.

## Needs Attention

An unresolved active Work Order in `REQUIRED_MISSING`, `NEEDS_REVIEW`, or `EXPIRED` deterministically produces the stable `WORK_ORDER_ACCESS_REQUIRED` condition in the Operations queue at High priority. Changing readiness to `RECEIVED`, `ARRANGED_ANOTHER_WAY`, or `NOT_REQUIRED`, or moving the Work Order out of an operationally unresolved lifecycle state, self-resolves the item through the existing reconciliation history. Reappearance reopens the same condition. Readiness never changes scheduling, assignment, dispatch, interruption, completion, cancellation, or any other lifecycle state.

## Security boundary

Readiness state and state-only audit history are not credential storage. The UI explicitly prohibits codes, passwords, PINs, links, and credential files. Needs Attention and list/detail projections do not select the temporary credential relation or credential fields. Phase 3A does not expose, migrate, copy, validate, retrieve, or broaden access to temporary credentials.

## API

- `GET /api/v1/work-orders/:id/access-readiness/history` — ADMIN or SUPERVISOR.
- `PATCH /api/v1/work-orders/:id/access-readiness` — ADMIN or SUPERVISOR; body `{ "state": <controlled value> }`.

## Deployment and recovery

Deploy the additive `20260818230000_work_order_access_readiness` migration before the API. Existing Work Orders safely default to `NOT_REQUIRED`; operators must deliberately classify visits that require access. Roll forward rather than deleting audit history. If a state is wrong, an authorized operator records the correct controlled state, producing a compensating history event. Never repair readiness by editing Work Order lifecycle state or inserting credential data anywhere in readiness history.
