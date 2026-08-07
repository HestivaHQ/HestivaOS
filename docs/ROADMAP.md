# Technical roadmap

Only currently identified technical follow-up work is listed here.

## Urgent

- Remove duplicate Prisma migration execution so API startup has one migration owner.
- Add automated API tests and establish a passing root `npm test` baseline.
- Complete dependency vulnerability review and remediate assessed findings.
- Verify in every control plane that Cloudflare native Git is the only active web deployment controller.
- Establish production monitoring for Worker errors, API availability/health, and Supabase dependency failures.

## Near-term

- Migrate the Railway API away from the legacy `mmapi` hostname, coordinating API variables, CORS, rebuilds, and verification.
- Automate and regularly test database and critical Storage backup/restore procedures.
- Remove the rollback-only Railway web service after Cloudflare rollback procedures are proven.
- Clean up account identity and ownership across GitHub, Cloudflare, Railway, and Supabase.

## Later

- Expand automated coverage to integration, authentication, storage, migration, and deployment smoke tests.
- Mature monitoring with actionable alert thresholds and incident runbook links.
- Periodically test backup recovery and audit deployment-controller ownership.
