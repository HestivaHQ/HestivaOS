# Needs Attention Foundation v1 recovery

## Missing or stale attention item

Needs Attention v1 is derived from authoritative Work Order facts and reconciled on protected attention reads. Do not repair a missing/stale item by inserting or editing attention rows manually. First inspect the underlying Work Order schedule, lifecycle, normalized Technician assignments, Crew assignment, completion acceptance, and management acknowledgement. Correct the authoritative domain fact through its normal workflow, then reload Needs Attention so reconciliation can open, update, resolve, or reopen the durable item.

## Duplicate-condition or transaction conflict

`condition_key` is the durable uniqueness boundary. Reconciliation runs serializably and retries serialization/deadlock and first-observation unique-key races. If a request still fails, preserve both the Work Order and attention history, reload, and retry the read. Never mint an alternate condition key or delete an existing row to bypass uniqueness.

## Wrong owner or orphaned ownership

Ownership is permission-aware. If an owner becomes inactive or loses eligibility for the item's queue, reconciliation clears that owner and records a reassignment activity so the item returns to the eligible queue. Do not restore visibility by changing roles, user status, or queue values ad hoc. Correct the User/role through normal access management or assign an eligible owner through the protected attention API.

## Seen versus resolved

Seen is acknowledgement only. A Seen item remains open until its authoritative condition clears. Do not mark an item resolved merely to remove it from the Dashboard. Resolve the Work Order condition instead. If the condition returns later, the durable item reopens and retains occurrence/audit history.

## Unexpected priority or visibility

The v1 policy is deterministic: overdue unresolved Work Orders are Critical/Operations, today-unassigned Work Orders are High/Operations, and completed jobs awaiting management acknowledgement are Normal/Management Review. Queue visibility and ownership are role-aware. If presentation differs, inspect the item type, queue, priority, caller application role/status, and underlying Work Order facts before changing data.

## Rollback and data preservation

The migration is additive. For an application regression, redeploy the previous API/web revision and retain the attention schema and history. Do not run `prisma migrate reset`, remove enum values, drop attention tables, or delete `_prisma_migrations` history as an application-recovery shortcut. A database rollback requires a separately reviewed plan that first proves whether attention history can be safely preserved/exported.
