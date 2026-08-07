# ADR-0008: Repository documentation policy

- **Status:** Accepted
- **Date:** 2026-08-07

## Context

Implementation and engineering documentation can drift when documentation is treated as optional follow-up work. The repository already maintains current-state, operational, planning, historical, and decision records, but it did not encode a repository-wide completion rule or automatically detect implementation PRs with no documentation change.

## Decision

Documentation is part of the Definition of Done. The root `AGENTS.md` defines the mandatory update matrix, historical-record rules, verification requirements, and implementation PR checklist for all future Codex work.

Pull requests run `scripts/validate_documentation.py`. The validator fails when a meaningful implementation or configuration change has no change under `docs/`, prints path-specific guidance, and excludes Markdown-only edits, README formatting, comment-only code edits, and license changes. This is a minimum consistency gate: reviewers and implementers remain responsible for choosing every applicable document and verifying its accuracy.

Historical documents and accepted ADRs are preserved. A later decision must add a superseding ADR rather than rewriting this record.

## Consequences

- Every implementation carries its documentation and verification evidence in the same PR.
- The technical work log and changelog are appended for every implementation; specialized documents follow the update matrix.
- CI catches a completely missing documentation update but cannot prove that prose is accurate or complete, so human review remains mandatory.
- Documentation-only corrections and comment/license-only changes do not create artificial historical entries.
