# Shift Planning selector search v1

**Status:** Implemented on the Phase 1B branch; merge remains subject to exact-head PR quality gates.

## Purpose

Shift Planning stores canonical Crew, Technician and Work Order relationships. The form must remain usable as those catalogues grow without loading fixed 100-record snapshots into the browser.

## Implemented behavior

- Crew selection uses the existing bounded Crew search API with a 20-record page and 300 ms debounce.
- When no Crew is selected, Technician selection uses the existing bounded active-Technician search API with a 20-record page and 300 ms debounce.
- When a Crew is selected, the designated-Technician selector continues to use the Crew's authoritative member snapshot rather than an unrelated global search result.
- Linked Work Order selection uses the existing bounded Work Order search API with a 20-record page and 300 ms debounce.
- Work Order search can use the existing server-side reference, Customer, Property, Service, Crew, title and description matching; this slice does not create a competing search index.
- Currently selected historical Crew, Technician and Work Order records are retained in the form while search results refresh so editing an existing Shift does not silently lose an out-of-page relationship.
- Inactive historical Crew records remain identifiable when already selected; new Crew search remains active-only.

## Preserved boundaries

This slice does not change:

- Shift persistence or status semantics;
- Crew membership or leadership;
- Technician eligibility rules;
- Work Order lifecycle or assignment;
- scheduling/dispatch policy;
- recurring-service behavior;
- Finance, Correspondence, Messaging or notification delivery;
- database schema or migrations.

The existing `/api/v1/crews`, `/api/v1/technicians` and `/api/v1/work-orders` domain APIs remain authoritative.

## Validation expectations

The repository quality gate must continue to pass typecheck, builds, workspace tests, documentation validation, secret scanning, whitespace checks, Cloudflare/OpenNext validation and PostgreSQL migration replay. No migration is added by this slice.
