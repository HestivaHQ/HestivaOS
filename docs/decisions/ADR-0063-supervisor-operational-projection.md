# ADR-0063: Project canonical execution truth for Supervisor operational review

- Status: Accepted
- Date: 2026-08-19

## Decision

Provide a SUPERVISOR-only, read-only aggregation endpoint and workspace over existing Work Order and Needs Attention facts. Persist no Supervisor-specific status or review record. Mutations remain on existing explicitly role-authorized domain endpoints, and the broad projection returns counts/state rather than evidence paths or protected access data.

## Consequences

Supervisors gain one exception-first entry point without a duplicate Operations application or business domain. Existing ADMIN-only staffing, scope-mismatch, credential, access-recovery, canonical-record, user-access and configuration authority remains unchanged. Future authority expansion requires a separate decision.

## Alternatives rejected

- A Supervisor alert table duplicates Needs Attention identity and lifecycle.
- A second completion review action competes with management acknowledgement.
- Returning full Work Order/evidence/credential records overexposes data not needed for queue review.
