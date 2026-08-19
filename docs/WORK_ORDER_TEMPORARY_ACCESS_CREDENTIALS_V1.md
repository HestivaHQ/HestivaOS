# Protected Work Order Temporary Access Credentials v1

Status: Phase 3B implemented on 2026-08-18. Phase 3C escalation and Phase 3D messaging recovery remain deferred.

## Contract

A credential belongs to exactly one Work Order visit. It is not Property data and is never inherited by recurrence or replacement flows. ADMIN stores protected text and/or registers an already-private Work-Order-scoped attachment. Protected text is encrypted using authenticated encryption before persistence. Attachment originals remain private and unchanged; filename, media type, and optional derived metadata do not replace the original.

New credentials begin `PENDING_REVIEW`. ADMIN acceptance, rejection, revocation, explicit reveal, and expiry detection append actor-attributed events. Only accepted credentials inside their validity interval and not revoked may be revealed. Metadata lists never include ciphertext or private storage paths. Reveal is a separate ADMIN-only audited request.

Creation transitions Phase 3A readiness to `NEEDS_REVIEW`; acceptance transitions it to `RECEIVED`; rejection remains `NEEDS_REVIEW`; expiry/revocation transitions it to `EXPIRED`. All effective changes use the existing Phase 3A readiness event and Work Order activity model. Credential operations never change scheduling, assignment, lifecycle, completion, correspondence, or Finance.

## API

All routes require ADMIN:

- `GET /api/v1/work-orders/:id/temporary-access-credentials` — safe metadata and audit history.
- `POST /api/v1/work-orders/:id/temporary-access-credentials` — retry-safe creation using `requestId`.
- `POST /api/v1/work-orders/:id/temporary-access-credentials/:credentialId/review` — `ACCEPT` or `REJECT`.
- `POST /api/v1/work-orders/:id/temporary-access-credentials/:credentialId/reveal` — audited protected read of an operationally usable credential.
- `POST /api/v1/work-orders/:id/temporary-access-credentials/:credentialId/revoke` — preserves the record and removes usability.

Never include credential material in logs, Needs Attention, broad Work Order APIs, Dashboard, analytics, generic activity notes, or documentation examples.
