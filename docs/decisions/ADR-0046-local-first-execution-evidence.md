# ADR-0046: Retain local-first Execution Evidence through authoritative acknowledgement

- Status: Accepted
- Date: 2026-08-17

## Context

ADR-0045 established section evidence identities and sync states but deliberately deferred binary capture and transport. Mobile workers must not wait for unreliable uploads, and a successful object upload alone cannot prove that evidence is authorized and linked to the active assignment and frozen scope.

## Decision

The canonical `/technician` workflow compresses JPEG, PNG, or WebP input on device through the same shared compressor used by legacy Work Order photos. It writes the WebP Blob and stable UUID metadata to IndexedDB version 3 before claiming success. Existing job and operation stores are preserved. Unacknowledged Blobs are never housekeeping candidates.

Execution Evidence remains distinct from generic `WorkOrderPhoto` BEFORE/AFTER records. It reuses the configured `work-order-photos` Supabase bucket, with deterministic `<work-order>/<scope-revision>/<section>/<evidence-id>.webp` object paths and idempotent upsert. The browser uses only the existing Supabase session/anon boundary; no service-role credential is exposed.

An assigned active Technician uploads sequentially, then calls an assignment-scoped acknowledgement endpoint. The backend derives Technician identity, verifies the active started scope and section relationship, binds the client UUID idempotently, and returns the authoritative record, storage path, and acknowledgement timestamp. An outcome may reference that same UUID before upload, allowing local progress while preventing evidence/outcome identity races. Only server-acknowledged local Blobs are cleaned, in bounded batches.

## Consequences

Required and exception evidence saved durably on device satisfies field progression even while upload is pending or retrying. Failed upload, lost response, stale authority, or metadata rejection preserves the local record. Job Leader review distinguishes missing records from captured/queued/retry records already represented authoritatively.

The existing bucket/public-URL posture is not broadened or migrated here. Execution Evidence metadata stores a path, not a public URL; a future approved private read/download and legacy-bucket privacy migration remains necessary. Complete Job, incidents, damage, scope-mismatch resolution, notifications, credentials, and Homent Supervisor remain deferred.
