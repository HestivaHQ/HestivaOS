# Work Order Access Readiness v1

Status: implemented Phase 3A foundation on 2026-08-18 and integrated with Phase 3B protected credential handling later that day. Phase 3C appointment-relative escalation is implemented through `WORK_ORDER_ACCESS_OPERATIONS_V1.md`; Phase 3D messaging recovery and Finance remain deferred.

## Canonical model

`WorkOrder.accessReadiness` is visit-specific operational state and is independent of `WorkOrder.status`. Its controlled values are `REQUIRED_MISSING`, `RECEIVED`, `NEEDS_REVIEW`, `EXPIRED`, `ARRANGED_ANOTHER_WAY`, and `NOT_REQUIRED`. Stable access facts and instructions remain on Property; Phase 3B temporary credential commands use this state and its history without copying protected contents into readiness.

Every effective readiness change appends a `WorkOrderAccessReadinessEvent` with old/new state, actor, and time, and also adds a state-only Work Order activity. ADMIN and SUPERVISOR may read history and change state through the constrained Work Order panel and protected API. Repeating the current state is a no-op.

## Needs Attention

An unresolved active Work Order in `REQUIRED_MISSING`, `NEEDS_REVIEW`, or `EXPIRED` deterministically produces the stable `WORK_ORDER_ACCESS_REQUIRED` condition in the Operations queue. Phase 3C derives its priority from appointment time: more than 24 hours is Normal, 24 hours through exactly 4 hours is High, and less than 4 hours or at/after the appointment is Critical. Changing readiness to `RECEIVED`, `ARRANGED_ANOTHER_WAY`, or `NOT_REQUIRED`, or moving the Work Order out of an operationally unresolved lifecycle state, self-resolves the item through the existing reconciliation history. Reappearance reopens the same condition. Readiness never changes scheduling, assignment, dispatch, interruption, completion, cancellation, or any other lifecycle state.

## Security boundary

Readiness state and state-only audit history are not credential storage. The readiness UI explicitly prohibits codes, passwords, PINs, links, and credential files. Needs Attention and broad list/detail projections do not select the temporary credential relation or credential fields. Phase 3B uses separate ADMIN-only protected endpoints described in `WORK_ORDER_TEMPORARY_ACCESS_CREDENTIALS_V1.md`.

## API

- `GET /api/v1/work-orders/:id/access-readiness/history` — ADMIN or SUPERVISOR.
- `PATCH /api/v1/work-orders/:id/access-readiness` — ADMIN or SUPERVISOR; body `{ "state": <controlled value> }`.

## Deployment and recovery

Deploy the additive `20260818230000_work_order_access_readiness` migration before the API. Existing Work Orders safely default to `NOT_REQUIRED`; operators must deliberately classify visits that require access. Roll forward rather than deleting audit history. If a state is wrong, an authorized operator records the correct controlled state, producing a compensating history event. Never repair readiness by editing Work Order lifecycle state or inserting credential data anywhere in readiness history.

## 2026-08-19 Phase 3D integration

Human-triggered messaging recovery derives eligibility from this canonical readiness plus operational lifecycle and configured conversation facts. It stores no second readiness/countdown state. `ARRANGED_ANOTHER_WAY`, `NOT_REQUIRED`, and operationally usable `RECEIVED` are excluded; response arrival does not change readiness. See `WORK_ORDER_ACCESS_RECOVERY_V1.md`.
