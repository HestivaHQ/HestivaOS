# ADR-0065: Authorize append-only Technician completion corrections

- Status: Accepted
- Date: 2026-08-19
- Supersedes: ADR-0047 only where that decision deferred correction/reopen authority

## Decision

ADMIN or SUPERVISOR may authorize a reasoned correction limited to named sections of one completed frozen Execution Scope. The original completion and current acknowledgement are snapshotted in an append-only authorization. Only the currently assigned Technician who submitted the current affected outcomes may append corrected outcomes and resubmit with stable operation identities. The Work Order remains completed throughout.

The first corrected outcome makes the prior acknowledgement non-current without deleting it. Corrected resubmission requires a fresh use of the existing ADMIN/SUPERVISOR completion acknowledgement. Scope revisions, prior outcome events, evidence, incidents, interruption and scope-mismatch history remain immutable.

## Consequences

Genuine execution mistakes can be corrected without general historical edit authority or a competing completion-review system. Offline retry converges and conflicts remain reviewable. Finance, pricing, customer correspondence delivery, staffing and unrelated lifecycle behavior remain outside this decision.
