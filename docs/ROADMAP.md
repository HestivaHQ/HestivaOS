# Technical roadmap

Only currently identified technical follow-up work is listed here.

## Urgent

- Complete the remaining dependency remediation after the safe transitive patch refresh: validate and update Wrangler in isolation, then investigate Next.js/OpenNext/Cloudflare compatibility before any framework-major decision.
- Verify after each controller or account change that Cloudflare native Git remains the only active web deployment controller.
- Establish alert delivery for Worker errors and the now-observable API liveness/readiness and Supabase dependency failures.

## Near-term

- Migrate the Railway API away from the legacy `mmapi` hostname, coordinating API variables, CORS, rebuilds, and verification.
- Automate and regularly test database and critical Storage backup/restore procedures.
- Remove the rollback-only Railway web service after Cloudflare rollback procedures are proven.
- Clean up account identity and ownership across GitHub, Cloudflare, Railway, and Supabase.

## Later

- Expand automated coverage to integration, authentication, storage, migration, and deployment smoke tests.
- Mature monitoring with actionable alert thresholds and incident runbook links.
- Periodically test backup recovery and audit deployment-controller ownership.
