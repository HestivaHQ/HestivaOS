# Technical roadmap

## Slice 5M accepted conversion status (2026-08-16)

- Completed: atomic ADMIN acceptance of eligible ONE_TIME Quotes into one linked Work Order, including durable resolution consumption/materialization, exact accepted revision, quantity-bearing add-ons, audit, rollback, and retry/concurrency protections.
- Completed: supported recurring conversion into one agreement plus one initial visit. Still planned: review UI, controlled resolution replacement/duplicate merge, and non-lossy exact-floor/access/time-window/photo/commercial handoff.

## Slice 5M match/review status (2026-08-15)

- Completed: Customer + Property match-or-review foundation for accepted-Quote preparation, including ADMIN resolution persistence and preflight visibility.
- Historical plan is completed for ONE_TIME and supported recurring operational conversion as of 2026-08-16. Controlled duplicate-Customer merge/reversal and resolution replacement remain separate work.

## Completed 2026-08-15

- Added the ADMIN-only internal Quote list/detail, non-mutating acceptance-readiness preflight, terminal revision-checked Decline workflow, durable accepted-revision identity, and unique restricted future operational links. Quote Accept remains unavailable until Customer/Property resolution and Work Order/Recurring Service Agreement creation can commit atomically.

## Completed 2026-08-14

- HestivaOS Issue #79 completed the system-wide Laundry & Ironing add-on operating model: add-on-only eligibility for Regular Home Cleaning and Deep Cleaning, equipment-dependent Wash/Dry/Fold versus Wash/Hang outcomes, approved per-load pricing, structured Website Quote Contract v2 transport, HestivaOS-owned validation/pricing, positive operational add-on quantities, recurring-visit quantity propagation, and explicit labour/time capacity approval. Historical Laundry Folding identity remains preserved while new selection uses canonical Laundry as `ADD_ON`.
- The Website → HestivaOS guarded ingestion boundary is live in source and production-handoff smoke-tested. The website requires HestivaOS acknowledgement/authoritative `quoteReference` before reporting successful quote intake. Remaining COIDA assessment replacement is an operational costing-input follow-up, not unfinished Issue #79 software behavior.

## Completed 2026-08-10

- Product Slice 5F completed Contact-name-first Customer compatibility, corrected create-only Customer continuation, and Team/Admin navigation ownership; Slice 5E completed the verified operational continuation from Customer to Property to Work Order, controlled Customer deletion conflicts, authoritative shared-shell role presentation, Property Type empty-state behavior, dormant Province UI, and shared operational navigation ordering. A broader Customer archival lifecycle remains separate planned work only if product requirements approve it.

Only currently identified technical follow-up work is listed here.

## Urgent

- Run the authoritative GitHub dependency-security diagnostic for the Next.js 16 migration; do not close dependency remediation until it verifies the target counts.
- Migrate the deprecated Next.js `middleware.ts` convention to `proxy` in a separately verified authentication and route-protection change.
- Verify after each controller or account change that Cloudflare native Git remains the only active web deployment controller.
- Establish alert delivery for Worker errors and the now-observable API liveness/readiness and Supabase dependency failures.

## Near-term

- Complete remaining Slice 5M work after atomic ONE_TIME and recurring conversion: review UI, unresolved exact-floor/access/time-window/photo/commercial mapping, and safe non-lossy operational import.
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

- The versioned Slice 5M contracts resolve the quote-boundary meaning of bathrooms, exact floor/building access, Post-Renovation Cleaning, eco-friendly preference, quantity-bearing Extra Refrigerator/Balcony-Patio selections, and structured Laundry/Ironing. Accepted-operation add-on quantity persistence is complete for Work Orders and Recurring Service Agreements; exact-floor persistence and other non-Laundry handoff gaps remain separate Slice 5M work where still unresolved.
- Design safe Supabase Storage object cleanup for deleted Work Order photo metadata only if an approved server-side storage boundary and orphan-reconciliation procedure are introduced.

## Accepted-quote follow-ups after Slice 5I

- **Slice 5N — Work Order Technician/Crew assignment:** support one or many Technicians per Work Order and optional existing Crew selection; allow Crew selection to prepopulate Technicians followed by job-specific adjustments; permit one-Technician jobs without a permanent Crew; and count supervisors/drivers as job Technicians only when they perform the job. The canonical worker term remains Technician.

- **Slice 5J — Property operational profile (completed 2026-08-10):** Property owns nullable controlled bedrooms, bathrooms, living areas, storeys, floor size, outdoor area, estate classification, grouped unit-floor compatibility, and lean persistent logistics/household/care fields. Slice 5M-B separately transports exact unit floor 0–50 and building access for later non-lossy accepted handoff.
- **Slice 5K — Current website service/add-on reconciliation (completed 2026-08-10):** reconciled the then-current quote vocabulary, introduced dual-context Service availability, added six evidence-backed capabilities, removed stale undeployed scope architecture, and documented fail-closed ambiguities. Later Issue #73 product decisions and Slice 5M contracts supersede the previously unresolved quote-contract semantics where explicitly recorded.
- **Slice 5J-A — Current Property quote vocabulary alignment (completed 2026-08-10):** added controlled Property destinations and compatibility behavior for the then-verified Property vocabulary.
- **Slice 5L — Recurring agreement architecture (completed 2026-08-11):** owns recurring agreement identity, standard recurrence rules, next service date, lifecycle, and independent generated Work Orders.
- **Slice 5M-A — Quote domain foundation (completed 2026-08-11):** added authoritative Quote identity, revisions, pricing snapshots/line items, photo provenance/status, activities, and retry identities.
- **Slice 5M-B plus Laundry v2 contract work (completed):** defines the structured Website Quote contracts, validation semantics, private transport/authentication contract, authoritative pricing response, photo identity/hash contract, structured Laundry/Ironing fields, and cross-repository consumer documentation. Later runtime work exposed the guarded ingestion endpoint rather than changing these contract semantics.
- **Slice 5M runtime ingestion and decision foundation:** guarded Website ingestion, authoritative pricing/profitability calculation, replay handling, OpenRouteService road-distance costing, atomic NEW Quote persistence, ADMIN review APIs, readiness preflight, terminal Decline, and atomic ONE_TIME and supported recurring Accept conversion are implemented. Review UI and remaining non-lossy handoff/recovery work remain separate follow-ups.

## 2026-08-10 status update

- Completed Slice 5J-A: current website Property quote vocabulary received controlled OS destinations, type-aware unit-floor/Studio validation, additive legacy compatibility, and live Work Order summaries.
- At that point Slice 5M remained planned and unimplemented; this historical status is superseded by the 2026-08-11 and later 2026-08-14 status above.

## Completed 2026-08-11

- Slice 5L introduced Property-owned recurring service agreements, structured standard recurrence, manual CUSTOM tracking, lifecycle management, idempotent one-upcoming-visit generation, Work Order snapshots, and Customer cleanup integration.
- Slice 5M-A introduced the authoritative Quote domain and durable retry identities.
- Slice 5M-B defined the website Quote contract on its focused branch; this is a historical checkpoint superseded by the later merged contract/runtime work recorded above.

## Protected follow-up after Slice 5M-B

- Guarded Slice 5M Website ingestion and authoritative pricing are now implemented. The remaining protected path is accepted-Quote decision/orchestration and any still-unresolved non-Laundry persistence/storage mappings; do not regress the established Website authentication, idempotency, profitability or structured-v2 boundaries.
- Slice 5N remains the one/many Technician and optional Crew assignment redesign; recurring agreement generation uses current Work Order assignment.
- Slice 5O remains skills and remaining evidence-backed operational fields.

- **Completed 2026-08-16:** non-lossy accepted Quote handoff now projects typed initial-visit context, stable recurring context, accepted-revision photo references, and a visit-scoped temporary-credential boundary. Admin/cleaner presentation and role-filtered credential APIs remain planned UI/security work.
