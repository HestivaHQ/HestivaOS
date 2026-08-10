# ADR-0018: Make Hestiva OS the canonical operational service catalogue

- **Status:** Accepted
- **Date:** 2026-08-10

## Context

Hestiva OS had mutable Services and Cleaning Job Template relationships, while the supplied public website sources exposed primary pages, optional/add-on concepts, quote-flow pseudo-options, and inconsistent Eco naming. Direct import without classification or reconciliation could duplicate identities or destroy history.

## Decision

Hestiva OS owns canonical operational Services. Service uses only `PRIMARY` and `ADD_ON`, active/inactive lifecycle, and a normalized comparison key. ADMIN alone manages the catalogue; authenticated workflows may read it. Reconciliation preserves existing IDs and relationships, creates only missing approved entries, recognizes `Eco-Friendly Cleaning` as the alias of canonical `Eco-Conscious Cleaning`, and preserves ambiguous and OS-only records.

Laundry Folding is one `ADD_ON` record because the supplied page explicitly describes it as optional. The six supplied `visualAddOns` become add-on records. `Cleaning Add-On Services` remains a website grouping, and quote-only pseudo-options never become Services. Permanent deletion is not exposed.

## Consequences

Inactive Services are excluded from new operational selection but remain readable through historical relationships. Website synchronization and subordinate job-type mapping are deferred. The website does not call the authenticated management API, and no new pricing, duration, staffing, or marketing-content model is introduced.

## Review triggers

Review this decision if Services gain materially different operational classes, a public catalogue API is designed, or Work Orders gain a direct Service relationship.
