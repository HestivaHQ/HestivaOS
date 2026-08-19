# ADR-0059: Protect and review visit-scoped temporary access credentials

- **Status:** Accepted
- **Date:** 2026-08-18
- **Related coordination:** HestivaOS Issue #132; Issue #73 Decisions 48–57

## Context

ADR-0058 separates operational access readiness from credential contents. The existing `WorkOrderTemporaryAccessCredential` foundation already assigns a credential to one Work Order, but it did not provide protected text, actor provenance, review history, or narrow retrieval.

## Decision

Extend that model rather than create a vault. New protected text is encrypted at the API boundary with AES-256-GCM and a deployment-owned 32-byte key. Original attachment objects remain in private storage; the record retains a Work-Order-scoped path and original filename/media type, while optional derived metadata remains supplementary. Metadata projections omit ciphertext and storage paths.

Only ADMIN may create, list metadata, review, revoke, or explicitly reveal a credential in Phase 3B. Every reveal and lifecycle action is actor-attributed in append-only credential events. Creation is retry-safe through a unique request UUID. Human acceptance moves the canonical Phase 3A readiness to `RECEIVED`; creation/rejection moves it to `NEEDS_REVIEW`; revocation or detected expiry moves it to `EXPIRED`. These use Phase 3A's Work Order state and append-only transition/activity history.

Credentials remain bound to one Work Order. Recurring generation and replacement creation do not copy them. Expiry and revocation remove usability but retain encrypted text, attachment reference, and history. No list, Dashboard, Needs Attention, generic activity, analytics, or Technician projection contains protected values.

## Consequences

Deployment must configure `TEMPORARY_ACCESS_CREDENTIAL_ENCRYPTION_KEY`; losing it prevents recovery of protected text, while rotation requires an explicit future re-encryption procedure. Existing legacy rows remain preserved but lack newly introduced actor/request provenance. Phase 3C appointment-relative escalation, Phase 3D messaging recovery, customer correspondence, provider behavior, and Finance remain deferred.
