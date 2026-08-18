# Work Order Material Change v1

## Purpose

Phase 2A implements Issue #73 Decisions 72–73 without replacing the existing Work Order or Technician execution architecture.

## Material booking fields

The controlled workflow treats these as material when supplied after a Work Order has moved beyond `NEW`:

- Customer / Property association;
- primary Service;
- add-ons and quantities;
- frequency / custom-frequency detail;
- home-condition field used by the booked service model;
- scheduled date/time;
- cancellation;
- completion timestamp is protected execution history and is never editable through a booking change.

Description and priority remain ordinary internal fields unless a later product decision makes a specific use material.

## Operational-state policy

- `NEW`: pending/unconfirmed; ordinary edit remains available.
- `ASSIGNED`: future confirmed job; controlled material change is allowed after consequence review.
- `ACCEPTED` / `TRAVELLING`: imminent; controlled change requires an explicit override reason before commit.
- `ON_SITE` / `WAITING_FOR_PARTS`: in progress; booking rewrite fails closed and later Phase 2B owns explicit in-service scope-difference resolution.
- `COMPLETED` / `CLOSED` / `CANCELLED`: historical operational truth; material rewrite is blocked.

No arbitrary time-before-service threshold is introduced in v1.

## Preview contract

`POST /work-orders/:id/material-change/preview` is ADMIN-only and returns:

- current Work Order reference/status;
- `expectedUpdatedAt` optimistic-concurrency token;
- operational stage;
- exact material fields detected;
- allowed/blocked result and blocked reason;
- whether an override reason will be required;
- deterministic consequence flags for scheduling, staffing, pricing, execution scope, correspondence eligibility and the Finance integration boundary;
- current and requested booking values.

The preview does not commit a change, send correspondence, or modify Finance state.

## Generic-route boundary

The proposed Phase 2A branch prevents confirmed material edits from silently continuing through generic `PATCH /work-orders/:id`, and prevents confirmed cancellation from bypassing the controlled workflow. These guards are not considered merge-ready until the audited commit action exists in the same PR, so normal production behavior is not intentionally left without a supported confirmed-change path.

## Remaining before Phase 2A is complete

- durable audited commit action;
- idempotent/stale-safe commit semantics;
- consequence confirmation and required override reason enforcement;
- Admin UI preview/confirm flow;
- final architecture/deployment/recovery/roadmap/work-log/changelog reconciliation;
- complete exact-head quality gate.
