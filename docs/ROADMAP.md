# Technical roadmap

Only currently identified technical follow-up work is listed here.

## Urgent

- Run the authoritative GitHub dependency-security diagnostic for the Next.js 16 migration; do not close dependency remediation until it verifies the target counts.
- Migrate the deprecated Next.js `middleware.ts` convention to `proxy` in a separately verified authentication and route-protection change.
- Verify after each controller or account change that Cloudflare native Git remains the only active web deployment controller.
- Establish alert delivery for Worker errors and the now-observable API liveness/readiness and Supabase dependency failures.

## Near-term

- Deliver focused follow-up product slices for Admin Settings and user access, Business Profile, Employee Records, and the Supervisor experience without treating Slice 1 as completion of those systems.
- Add functional Worker Issue and Job Exception models before presenting those approved alert categories; do not fabricate dashboard records.
- Design the `WorkOrder` to `Service` relationship; until then the dashboard accurately uses `WorkOrder.title` as its job label.
- Create the Management navigation gateway and direct-create Work Orders route state, then connect the currently non-destructive Management shortcut and `/work-orders` creation shortcut without brittle query parameters.
- Perform a separately scoped repository-wide Maintenance Marshall legacy cleanup while retaining required historical compatibility.
- Plan broader navigation and scheduling redesigns as separate product slices.
- Migrate the Railway API away from the legacy `mmapi` hostname, coordinating API variables, CORS, rebuilds, and verification.
- Automate and regularly test database and critical Storage backup/restore procedures.
- Remove the rollback-only Railway web service after Cloudflare rollback procedures are proven.
- Clean up account identity and ownership across GitHub, Cloudflare, Railway, and Supabase.

## Later

- Expand automated coverage to integration, authentication, storage, migration, and deployment smoke tests.
- Mature monitoring with actionable alert thresholds and incident runbook links.
- Periodically test backup recovery and audit deployment-controller ownership.
