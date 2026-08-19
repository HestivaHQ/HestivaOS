# Private Execution Evidence Read Security v1

Status: implemented on 2026-08-19.

Execution Evidence object paths are server-private implementation details. Broad Work Order, checklist, incident, scope-mismatch, Dashboard and Supervisor projections return only provenance and synchronization metadata needed by those views; they never return `storagePath` or permanent object URLs.

An authenticated ADMIN or SUPERVISOR may request one acknowledged artifact through `GET /api/v1/work-orders/:workOrderId/execution-evidence/:evidenceId/access`. An active Technician currently assigned to the Work Order may use `GET /api/v1/technician/jobs/:workOrderId/evidence/:evidenceId/access`. Both routes bind the database evidence identity to the requested Work Order before creating a 60-second Supabase Storage signed URL. Pending/local-only evidence has no read URL. The API response contains the evidence identity, temporary URL and expiry only.

The existing local-first capture, deterministic object path, upload and acknowledgement pipeline is unchanged. Capture time, Technician, Work Order, scope, section, outcome/incident linkage, client evidence UUID, synchronization state and acknowledgement remain authoritative. Signing neither copies nor mutates an artifact. The Storage bucket must remain private, and `SUPABASE_SERVICE_ROLE_KEY` is API-only and must never be logged, sent to the browser or prefixed with `NEXT_PUBLIC_`.

Post-completion correction is governed by `TECHNICIAN_COMPLETION_CORRECTION_V1.md`; it appends corrected outcome events and does not overwrite evidence or completion history. Evidence retrieval remains governed solely by this security contract.
