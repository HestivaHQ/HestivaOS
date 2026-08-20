# Controlled-input residual review — 2026-08-20

## Status

Verified against current HestivaOS `main` after PR #156 and the current Website source in `HestivaHQ/hestiva`.

This review closes the remaining generic Phase 1 backlog item named `Remaining evidence-backed controlled fields / subordinate job-type mappings` without introducing new runtime code, schema, migrations, enums, managed lists, or search infrastructure.

## Finding

No approved subordinate `job type` vocabulary exists for HestivaOS to implement.

The Website `JOB_TYPES` collection is not a canonical operational taxonomy. The approved Website migration mapping explicitly requires those mixed values to be decomposed into their actual concepts rather than imported as one new controlled list. The source values mix:

- recurrence/frequency;
- property type/context;
- service scope or condition;
- add-on/grouping language;
- furnishing/context details;
- manual-review `Other` paths.

HestivaOS already has authoritative homes for the concepts that are presently approved, including canonical Services, Property controlled fields, Work Order frequency, Home Condition, add-ons/quantities, quote/manual-review handling, Cleaning Job Templates, and Service Scope Templates.

Creating a new subordinate `JobType` enum/model/list, or copying Website `JOB_TYPES` into Cleaning Job Templates, would duplicate existing authority and invent semantics that the approved migration mapping explicitly rejects.

## Cleaning Job Template boundary

Cleaning Job Templates remain operational task definitions linked to canonical Service IDs. They are not a destination for customer-facing Website pseudo-options, recurrence choices, property shape, add-on grouping, or `Other` values.

No source inspected in this review approves a new subordinate job-type field or mapping on Cleaning Job Templates.

## Technician skills boundary

`Technician.skills` remains free-form historical/current data. The controlled-input audit identifies skills as a candidate only if evidence later establishes an approved reusable vocabulary.

No approved skills taxonomy, managed list, enum, or migration mapping was found in the current repository authorities. Converting skills now would therefore invent a list and is not authorized.

## Searchability

The previously identified large-list relationship-search residual is already complete for Work Orders and Shift Planning through bounded/debounced server-backed search. No remaining generic selector-search gap was found in this review.

## Result

The generic controlled-input/subordinate-job-type Phase 1 backlog item is closed by evidence review.

Future work in this area requires a specific new approved vocabulary, product decision, or evidenced defect. It must not reopen this generic item or infer a taxonomy from historical Website `JOB_TYPES`.

This review supersedes only the remaining-planning statements in `CONTROLLED_INPUT_FIELD_AUDIT.md` that described Technician skills and subordinate job-type mapping as future generic work. The historical audit remains preserved.
