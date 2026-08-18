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

Description and priority remain ordinary internal fields unless a later product decision makes a specific use material. Technician/Crew/Job Leader assignment remains owned by the existing assignment endpoint.

## Operational-state policy

- `NEW`: pending/unconfirmed; ordinary edit remains available.
- `ASSIGNED`: future confirmed job; controlled material change is allowed after consequence review.
- `ACCEPTED` / `TRAVELLING`: imminent; controlled change requires an explicit override reason before commit.
- `ON_SITE` / `WAITING_FOR_PARTS`: in progress; booking rewrite fails closed and Phase 2B owns explicit in-service scope-difference resolution.
- `COMPLETED` / `CLOSED` / `CANCELLED`: historical operational truth; material rewrite is blocked.

No arbitrary time-before-service threshold is introduced in v1.

## Preview contract

`POST /work-orders/:id/material-change/preview` is ADMIN-only and returns the current reference/status, `expectedUpdatedAt` optimistic-concurrency token, operational stage, detected material fields, allowed/blocked result, override-reason requirement, deterministic consequence flags, current/requested values, and explicit Finance/Customer Correspondence boundaries.

The preview does not commit a change, send correspondence, or modify Finance state.

## Commit and idempotency

`POST /work-orders/:id/material-change` is ADMIN-only. The request supplies:

- a stable client-generated `operationId` UUID that is reused on retry;
- the `expectedUpdatedAt` value from the reviewed preview;
- the reviewed material changes;
- an optional general reason;
- a mandatory 3–500 character override reason when the Work Order is `ACCEPTED` or `TRAVELLING`.

The service rechecks current Work Order state inside a serializable transaction, validates Customer/Property ownership, Service/add-on availability and add-on quantity/capacity rules, and fails closed if the Work Order changed after preview. An identical retry of a committed operation returns the existing append-only change record; reuse of the operation UUID for different requested content is rejected.

## Audit history

Migration `20260818223000_work_order_material_changes` adds append-only `work_order_material_changes` history with operation identity, actor, lifecycle stage, request hash, reason/override reason, previous booking snapshot, requested changes, consequence snapshot and server commit time. No historical rows are fabricated by migration.

`GET /work-orders/:id/material-changes` exposes the history to authorized operational management roles. Cancellation also retains the existing Work Order status/cancellation activity history.

## Generic-route boundary

Confirmed material edits can no longer silently continue through generic `PATCH /work-orders/:id`, and confirmed cancellation cannot bypass the controlled workflow. `NEW` remains editable through the ordinary pending-work path. Ordinary description/priority corrections and assignment changes retain their existing dedicated behavior.

## Admin UX

The Work Order detail page exposes the material-change panel only to ADMIN. It uses controlled Customer, Property, Service, frequency, home-condition and add-on selections, plus scheduled date/time and cancellation. Admin must run **Review consequences** before **Apply reviewed change**. Blocked in-progress/historical changes are shown without a commit action, and imminent work requires the override reason before commit.

## Explicit boundaries

- Phase 2A does not send email, WhatsApp, SMS or Messenger messages. A committed customer-facing change only establishes later Customer Correspondence eligibility.
- Phase 2A does not decide charges, credits or refunds. Scope/cancellation changes expose a Finance review boundary for the future Finance runtime.
- Phase 2B owns in-service scope differences/additional work.
- Phase 2C owns interrupted/unable-to-complete visits.
- Phase 2D owns linked replacement visits.
