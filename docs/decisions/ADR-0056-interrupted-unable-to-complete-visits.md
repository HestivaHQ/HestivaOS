# ADR-0056 — Interrupted / unable-to-complete visits

Status: Proposed implementation architecture for Phase 2C; becomes accepted when the implementing PR merges.

Date: 2026-08-18

## Context

Issue #73 Decisions 75-77 require HestivaOS to represent a visit that was genuinely attempted but could not be completed without falsely classifying that visit as completed or cancelled. The Technician application is local-first, Work Order execution history is authoritative, and management follow-up already belongs in Needs Attention.

Moving the original booking date after an attempted visit would erase operational history. Treating an interruption as a normal editable status would also let management manufacture field truth that belongs to the assigned Job Leader.

## Decision

HestivaOS will model an attempted but unable-to-complete visit as first-class `INTERRUPTED` Work Order state with append-only interruption and management-routing audit records.

- Only the assigned active Job Leader may record the factual field interruption.
- Interruption is allowed only from `TRAVELLING`, `ON_SITE`, or `WAITING_FOR_PARTS` and is protected by the cached Work Order version and applicable Execution Scope revision.
- Controlled interruption reasons are `NO_ACCESS`, `UTILITIES_UNAVAILABLE`, `SAFETY_CONCERN`, `CUSTOMER_REQUESTED`, `REQUIRED_RESOURCE_UNAVAILABLE`, and `OTHER`.
- The Technician client stores the interruption locally before reconciliation and reuses one operation UUID for idempotent server replay.
- Once the device records the interruption, the attempted visit is treated as read-only locally; the same visit must not subsequently be completed or silently rescheduled.
- Accepted interruptions transition the Work Order to `INTERRUPTED` and open a Needs Attention management-review item. Safety concerns are Critical; other interruptions are High.
- Management routing is separate from field truth. Controlled next actions are replacement visit, follow-up, partial-completion review, financial review, or close.
- A replacement-visit route does not move or rewrite the attempted visit. Phase 2D owns creation/linking of any replacement Work Order.
- A financial-review route records an operational need only. It creates no charge, refund, credit, payment obligation, or financial-clearance state.
- This workflow sends no customer correspondence.
- Closing after management review is the only Phase 2C route that changes the interrupted Work Order to `CLOSED`; the Needs Attention item is resolved with an audit activity.

## Consequences

Operational reporting can distinguish attempted/failed visits from cancellations and completions. Technician field truth remains owned by the Job Leader, management can route the consequence without rewriting the original visit, and later Phase 2D can create a replacement visit while retaining the original attempt as immutable history.

Finance and Customer Correspondence remain downstream domains and are not expanded by this ADR.
