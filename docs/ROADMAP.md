# Technical roadmap

## Completed 2026-08-10

- Product Slice 5F completed Contact-name-first Customer compatibility, corrected create-only Customer continuation, and Team/Admin navigation ownership; Slice 5E completed the verified operational continuation from Customer to Property to Work Order, controlled Customer deletion conflicts, authoritative shared-shell role presentation, Property Type empty-state behavior, dormant Province UI, and shared operational navigation ordering. A broader Customer archival lifecycle remains separate planned work only if product requirements approve it.

Only currently identified technical follow-up work is listed here.

## Urgent

- Run the authoritative GitHub dependency-security diagnostic for the Next.js 16 migration; do not close dependency remediation until it verifies the target counts.
- Migrate the deprecated Next.js `middleware.ts` convention to `proxy` in a separately verified authentication and route-protection change.
- Verify after each controller or account change that Cloudflare native Git remains the only active web deployment controller.
- Establish alert delivery for Worker errors and the now-observable API liveness/readiness and Supabase dependency failures.

## Near-term

- Reconcile the public `HestivaHQ/hestiva` quote form to the OS-owned `Eco-Conscious Cleaning` wording and design one-way website catalogue synchronization without exposing the authenticated management API.
- Map approved website subordinate job-type choices to the existing Cleaning Job Template architecture (or explicitly record why a choice is quote-flow-only) before importing controlled options.

- Controlled-input Slices 5B Phase 1 and 5C Phase 2 are complete. Deliver Phase 3 Work Order/Scheduling selector searchability and Phase 4 remaining evidence-backed fields as separate reviewed slices; do not invent lists.

- Employee Records (Slice 5), User Access Management (Slice 3), and Business Profile (Slice 4) are complete. Deliver the Supervisor experience and broader Employee Record management permissions as focused follow-ups; Future management Business Profile view/share groups and reuse by quotations, invoices, emails, and generated documents remain planned follow-ups.
- Design persistent administrative access-change audit history and a focused Supabase Admin invitation/provider-session-revocation workflow; current access changes are application-enforced and identifier-only server logged.
- Design a verified Supabase Auth email-change and confirmation UX; My Profile keeps authenticated email read-only until that flow is approved.
- Add functional Worker Issue and Job Exception models before presenting those approved alert categories; do not fabricate dashboard records.
- Product Slice 5H completed the additive `WorkOrder` to canonical `Service` relationship, automatic permanent references, structured display labels, and legacy-title fallback. Searchable selector enhancements beyond reference/title/customer/property/service matching remain planned under controlled-input Phase 3.
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

## Deferred website controlled-input alignment

- Reconcile the current website Property vocabulary gaps recorded in `QUOTE_TO_OS_VALUE_MAPPING.md`; bedrooms are implemented by Slice 5J, while unsupported `Other` and the website constraint boundary remain follow-up work.
- Design safe Supabase Storage object cleanup for deleted Work Order photo metadata only if an approved server-side storage boundary and orphan-reconciliation procedure are introduced.

## Accepted-quote follow-ups after Slice 5I

- **Slice 5N — Work Order Technician/Crew assignment:** support one or many Technicians per Work Order and optional existing Crew selection; allow Crew selection to prepopulate Technicians followed by job-specific adjustments; permit one-Technician jobs without a permanent Crew; and count supervisors/drivers as job Technicians only when they perform the job. The canonical worker term remains Technician.

- **Slice 5J — Property operational profile (completed 2026-08-10):** Property now owns nullable controlled bedrooms, bathrooms, living areas, and storeys plus lean persistent logistics/household/care fields. Floor size, outdoor status, entry method, and presence defaults remain deferred pending approved vocabulary and ownership evidence.
- **Slice 5K — Current website service/add-on reconciliation (completed 2026-08-10):** reconciled current quote vocabulary, introduced dual-context Service availability, added six evidence-backed capabilities, removed stale undeployed scope architecture, and documented fail-closed ambiguities.
- **Slice 5J follow-up — Current Property quote vocabulary alignment:** before 5M, reconcile the now-verified Floor Size, Outdoor, estate classification, bedroom `Other`, Storeys, and apartment/townhouse unit-floor vocabularies without changing them in 5K.
- **Slice 5L — Recurring agreement architecture:** own recurring agreement identity, recurrence rules, next service date, agreement status, individual Work Order generation, pause/resume/cancel behavior, exception dates, and approved long-term crew/service preferences.
- **Slice 5M — Quote handoff:** implement the website-to-OS acceptance boundary only after receiving Customer, Property, catalogue availability, and recurring models are ready. Slice 5I adds no webhook or automatic record creation.

## 2026-08-10 status update

- Completed Slice 5J-A: current website Property quote vocabulary now has controlled OS destinations, type-aware unit-floor/Studio validation, additive legacy compatibility, and live Work Order summaries.
- Slice 5M remains planned and unimplemented. Property vocabulary has no destination blocker; handoff orchestration and the four unresolved Slice 5K commercial decisions remain outside this slice.
