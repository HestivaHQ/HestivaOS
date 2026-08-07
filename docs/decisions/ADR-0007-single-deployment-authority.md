# ADR-0007: Single deployment authority

Status:
Accepted

Date:
2026-08-07

Context:
Competing automatic deployers can race, use different environment settings, obscure the deployed revision, and make incident rollback unpredictable.

Decision:
Allow exactly one active automatic deployment authority per service: Cloudflare native Git for web and Railway for API. Keep GitHub Actions web deployment and Railway web automatic deployment disabled.

Consequences:
Release provenance and rollback are clearer. Alternative automation must remain disabled. The Railway web service is temporarily retained as rollback-only and should be removed after rollback confidence is established.

Alternatives considered:
Multiple active controllers; manual-only production releases; keeping Railway web active in parallel.

Review trigger:
Review before changing any deployment controller, after cleanup verification, or when the temporary Railway web rollback service is removed.
