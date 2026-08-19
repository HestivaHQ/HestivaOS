# Admin and Operations UX Hardening v1

Status: Implemented on 2026-08-19.

## Audit result

- **Service Scope Template Admin editor — implemented.** The normalized domain and immutable versions already existed; this slice adds the missing ADMIN list/detail, create-version, publish, retire, controlled section editor, and usage visibility.
- **Pre-start scope revision comparison — implemented.** ADMIN can compare the latest planned Work Order scope with a published version for the same canonical Service and explicitly adopt it before start.
- **Management/direct-create navigation — implemented.** `/management` is the operations gateway and `/work-orders/new` is the canonical creation route. Customer/Property continuation supplies canonical IDs and validates ownership rather than creating records.
- **Controlled-input/searchability — partial.** Scope fields now use controlled evidence/repetition options and stable-key input; Technician search was already present. Large Customer, Property, Crew, and Service selectors still use capped existing API reads and require a separately reviewed server-search conversion.
- **Related UX hardening — implemented.** Loading/error/empty and immutable-history language were added, and legacy `mode=create` route state was removed.

## Version, adoption, and authority contract

Only ADMIN may read or mutate scope-template configuration and compare/adopt Work Order scope revisions. Editing creates a new draft. Published versions may be retired but are not deleted or rewritten; prior versions and Work Order revision links remain intact.

Comparison keys sections by stable key and reports added, removed, and changed title, requirements, or evidence policy. Adoption requires a separate confirmation and calls the existing revision service. Backend `startedAt` and lifecycle checks remain authoritative, so started or historical Work Orders retain the frozen scope selected at Start Job.

Accepted-Quote Work Orders may use this operational checklist flow, but adoption does not replace accepted Quote facts, Service/add-ons, quantities, commercial truth, or provenance. No Finance or correspondence action occurs.

## Navigation, selection, and boundaries

The direct-create route reuses the existing Work Order form and API. Property continuation sends Customer and Property IDs; preselection succeeds only when both appear in authorized projections and the Property belongs to the Customer. Invalid or mismatched IDs show an error and do not create or duplicate records.

Existing selectors remain canonical-ID controls and capped at the existing 100-item API pages. No indexer or unbounded fetch was introduced. No schema/migration, scheduling policy, role expansion, accepted-Quote conversion, pricing, Finance, correspondence, provider messaging, notification, or Technician execution behavior changed.
