# HestivaOS Launch Baseline Reset V1

Status: implementation contract for LR-1A

## Purpose

`Reset OS to Launch Baseline` is the destructive pre-launch reset boundary required before exhaustive LR-1B acceptance testing and again before real operations begin. It is deliberately separate from Customer Data Cleanup: Customer Data Cleanup owns one selected Customer tree, while Launch Baseline Reset owns the complete reviewed disposable pre-launch operational state of HestivaOS.

The target is a first-day-of-business HestivaOS state: canonical system/business configuration and approved application identities remain, but test Customers, Quotes, Work Orders, workforce fixtures, planning records, messaging/correspondence runtime state, public-enquiry state, operational counters and private operational Storage residue are removed.

## Preserved launch baseline

V1 explicitly preserves:

- Prisma migration history;
- HestivaOS application Users and immutable `UserAccessChange` security history;
- Business Profile and controlled Business Lists;
- canonical Service catalogue;
- Service Scope templates, versions and sections;
- Cleaning Job Templates and their Service relationships;
- Correspondence templates and template versions;
- Supabase Auth identities and profile-photo Storage.

Preserving Users does not mean every pre-launch User is automatically approved for launch. Final identity/account reconciliation remains a launch-readiness task. The reset intentionally does not delete external Supabase Auth identities because local database deletion is not an authoritative or safely reversible identity-provider operation.

## Disposable reset state

The reset uses an explicit reviewed table allowlist rather than `TRUNCATE ... CASCADE`. It includes the ordinary Prisma-backed operational aggregates and the raw-SQL runtime/audit tables that later slices introduced, including:

- Customer/contact/messaging-identity and Property state;
- Employee/Technician/Crew membership and Shift planning fixtures;
- Recurring Service Agreements and generated Work Orders;
- complete Work Order activities, assignments, checklist, photo/sign-off, access-readiness/access-recovery, temporary-credential, execution-scope, outcome, evidence, incident and completion-correction state;
- controlled scope-mismatch, material-change, interruption/route and replacement-visit audit state;
- Quote/revision/line/photo/activity state and Quote daily counters;
- secure Quote customer access grants, view challenges, engagement evidence and response records;
- Needs Attention runtime state;
- Website enquiries and enquiry counters;
- Messaging conversations/messages/statuses, private inbound-media metadata and WhatsApp Flow sessions;
- rendered Correspondence records, attempts/events and provider-event evidence while preserving the reusable canonical templates;
- Work Order daily counters.

A new public table that is absent from both the preserved and disposable classification blocks reset execution. This is intentional fail-closed behavior: adding a database table requires deciding whether it is launch configuration, protected history or disposable operational state before a later reset may claim the OS is clean.

## Destructive authorization and concurrency

The API is ADMIN-only through the existing authoritative role guard. A reset requires both:

1. the exact phrase `RESET HESTIVAOS TO LAUNCH BASELINE`; and
2. the exact SHA-256 fingerprint returned by the latest impact preview.

The fingerprint covers the current public-table inventory, exact reset-table counts, exact known Storage paths and active blockers. If state changes between preview and execution, the request fails and the operator must preview again.

The API never accepts caller-selected table names, SQL fragments, Storage buckets or arbitrary paths.

## Storage contract

Database cleanup alone is not a clean baseline. V1 discovers exact private operational objects from persisted metadata and removes only those exact paths:

- Work Order photos;
- acknowledged/offline Execution Evidence;
- temporary-access attachment evidence;
- secured inbound Messaging media.

The API uses the existing server-only Supabase service-role credential. No service-role secret is exposed to the browser. Storage objects are removed before the database reset because deleting database metadata first would destroy the authoritative exact object paths required for retry/reconciliation. If database reset fails afterwards, the remaining rows are still pre-launch disposable state; the operator must not begin live work and may retry the reset.

Quote photos are deliberately fail-closed in V1 until their actual Storage ownership/bucket is proven. If any `quote_photos.storage_path` exists, the preview blocks execution rather than guessing a bucket or deleting metadata first.

Profile-photo Storage is outside the operational reset boundary and is preserved with User identity.

## External-provider boundary

A local reset cannot unsend a real Resend email, WhatsApp message or Messenger message. LR-1B ordinary mutation testing must therefore use controlled test recipients and provider-safe boundaries. Any separately approved live-provider smoke test remains externally observable even after the local OS is reset.

Correspondence and Messaging database/runtime evidence created for pre-launch testing can be removed from the launch baseline, but the reset never claims this reverses an external provider action.

## Verification and launch gate

A reset is not successful merely because the destructive SQL returned successfully. After Storage cleanup and the database transaction, the service recomputes the full preview and requires:

- no unclassified public tables;
- zero rows in every classified reset table;
- zero known Work Order/evidence/credential Storage paths;
- zero known Messaging media Storage paths;
- zero unresolved Quote-photo Storage paths;
- no other reset blocker.

If post-reset verification is not clean, the API returns failure and HestivaOS must not be treated as launch-ready.

The final LR-1B acceptance run is followed by this verified reset before the first real operational record is created. Resetting the Work Order, Quote and enquiry daily counters is intentional so acceptance-test sequence allocation does not pollute the launch baseline.

## Relationship to Customer Data Cleanup

Customer Data Cleanup remains the narrow Customer-scoped irreversible tool defined by ADR-0020. It is useful during ordinary admin/test cleanup and keeps shared Shift records. It does not delete Storage objects and is not sufficient evidence of a clean launch baseline.

Launch Baseline Reset is broader, launch-gated, fail-closed on unclassified persistence, removes test Shift/workforce state, and verifies Storage obligations. Neither feature should be silently substituted for the other.
