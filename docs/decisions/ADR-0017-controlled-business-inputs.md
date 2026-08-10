# ADR-0017: Use controlled inputs for reusable business values

- Status: Accepted
- Date: 2026-08-10

## Context

Reusable categories entered as arbitrary strings accumulate spelling variants and weaken later filtering and automation. Unique names, contact details, addresses, identifiers, and notes cannot safely come from invented lists. Existing Employee job-title and department strings may contain production history that must not be rewritten.

## Decision

Classify editable values as free text, fixed enum, managed lookup, relationship, boolean, date/date-time, numeric/currency, or read-only derived. Use the smallest structured control supported by the domain. Fixed lifecycle values use existing Prisma enums; relationships store canonical IDs; configurable reusable values use ADMIN-managed active/inactive options. Unique record-specific values remain text.

Phase 1 adds typed `BusinessListOption` rows only for Job Titles and Departments. Employee records gain optional lookup foreign keys while retaining their legacy label columns. Selecting an active option records its ID and current canonical label. A missing or inactive option cannot be newly assigned. Deactivation, rather than deletion, preserves referenced history. Existing unlinked labels are neither seeded, normalized, nor rewritten and remain readable until an administrator intentionally replaces them.

## Consequences

The API, not only the UI, validates active lookup type and ID. The management surface is intentionally small and ADMIN-only. No default departments or job titles are seeded because repository evidence does not establish an approved organization list. Later modules require separate evidence and review rather than expansion into generic master data.
