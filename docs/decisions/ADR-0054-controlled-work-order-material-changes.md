# ADR-0054 — Controlled Work Order material changes

Status: Proposed implementation architecture for Phase 2A; becomes accepted when the implementing PR merges.

Date: 2026-08-18

## Context

Issue #73 Decisions 72–73 require confirmed Work Orders to use a controlled, audited material-change action instead of silently rewriting date/time, service scope, add-ons/quantities, Property/address, cancellation, or other fields that materially affect service delivery. Current HestivaOS `PATCH /work-orders/:id` can update several of those fields directly.

The Technician architecture also freezes execution truth once field work starts. A material booking edit must not mutate that frozen history or create a competing field-scope system.

## Decision

HestivaOS will distinguish ordinary internal corrections from material booking changes.

- `NEW` Work Orders remain pending/unconfirmed and may use the ordinary edit path for booking fields.
- Once a Work Order is confirmed beyond `NEW`, material booking fields use a dedicated Work Order material-change workflow.
- `ASSIGNED` is treated as a future confirmed job.
- `ACCEPTED` and `TRAVELLING` are treated as imminent operational states. Permitted material changes require an explicit override reason and consequence review.
- `ON_SITE` and `WAITING_FOR_PARTS` are in-progress. Material booking fields fail closed; later Phase 2B records explicit in-service scope differences without rewriting the originally booked/frozen execution scope.
- `COMPLETED`, `CLOSED`, and `CANCELLED` are historical operational truth and cannot be materially rewritten.
- Completion timestamps are authoritative execution history and are never ordinary booking-edit fields.

The controlled workflow starts with a deterministic preview that identifies the material fields and relevant scheduling, staffing, pricing, execution-scope, customer-correspondence, and financial review boundaries. Preview uses the Work Order `updatedAt` value as an optimistic concurrency token so commit cannot rely on stale review.

Finance and Customer Correspondence are integration boundaries only in Phase 2A. Material-change code must not invent payment decisions or send customer messages directly before those canonical domains exist.

## Consequences

- The generic Work Order edit/status routes can no longer be a bypass for confirmed material changes once the controlled commit action is complete.
- No arbitrary hours-before-service threshold defines imminent work; authoritative Work Order lifecycle state drives restrictions.
- Later Phase 2B can extend the same Work Order domain for in-service scope differences rather than creating a competing subsystem.
- Later Finance and Correspondence runtimes can subscribe to or act on committed material-change facts without becoming the Work Order source of truth.
