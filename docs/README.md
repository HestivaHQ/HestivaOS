# HestivaOS engineering documentation

This directory is the durable engineering and operational documentation system for HestivaOS. `AGENTS.md` defines repository procedure; ADR-0067 defines the three-stage validation workflow; ADR-0069 and `DOCUMENTATION_AUTHORITY.md` define documentation authority, impact declaration, bounded context loading and periodic reconciliation.

Documentation is part of Definition of Done, but canonical files have narrow responsibilities. Update the authority whose current truth actually changed; do not copy normal PR implementation detail into multiple global documents.

## New/resumed work: bounded context route

Load context in this order:

1. `AGENTS.md`.
2. This router.
3. The affected domain current-state document(s) below.
4. Only the active ADRs that materially govern the task.
5. `CROSS_SYSTEM_COORDINATION.md` plus the applicable issue only for cross-system/provider work.
6. Current merged source and relevant tests.
7. Relevant active PRs for collision/future-state review.

`CHANGELOG.md`, `TECHNICAL_WORK_LOG.md`, superseded ADRs and old PRs are historical lookup material, not mandatory startup reading unless the task requires historical analysis.

## Core authorities

| Document | Authority |
| --- | --- |
| [`DOCUMENTATION_AUTHORITY.md`](DOCUMENTATION_AUTHORITY.md) | Documentation responsibilities, impact declaration, bounded context and reconciliation cadence. |
| [`COMPANY_INFORMATION.md`](COMPANY_INFORMATION.md) | Verified, non-secret legal entity and corporate registration information for Hestiva (Pty) Ltd / Homent. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Current cross-domain technical architecture and authority boundaries. |
| [`WHY.md`](WHY.md) | Durable engineering/product rationale. |
| [`ROADMAP.md`](ROADMAP.md) | Verified current future work and sequencing. |
| [`CANONICAL_BACKLOG_FREEZE_2026-08-20.md`](CANONICAL_BACKLOG_FREEZE_2026-08-20.md) | Current reconciliation checkpoint preventing old plans from reopening merged or explicitly closed work. |
| [`CANONICAL_BACKLOG_FREEZE_2026-08-19.md`](CANONICAL_BACKLOG_FREEZE_2026-08-19.md) | Preserved historical planning checkpoint superseded by the 2026-08-20 freeze. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Current Cloudflare/Railway deployment procedure and controller ownership. |
| [`ENVIRONMENT.md`](ENVIRONMENT.md) | Environment-variable names/scopes and safe acquisition/recovery. |
| [`RECOVERY_GUIDE.md`](RECOVERY_GUIDE.md) | Current incident/recovery procedure. |
| [`CROSS_SYSTEM_COORDINATION.md`](CROSS_SYSTEM_COORDINATION.md) | Routing for active cross-repository/provider coordination. |
| [`OS_BROWSER_AUDIT_V1.md`](OS_BROWSER_AUDIT_V1.md) | Browser-level OS readiness, timing, production-safe interaction coverage, safety boundary and functional scenario matrix. |
| [`LR1B_OPERATIONAL_ACCEPTANCE_V1.md`](LR1B_OPERATIONAL_ACCEPTANCE_V1.md) | Pre-launch whole-OS operational acceptance execution ledger, role topology, Meta exclusion and final reset sequencing. |
| [`LR1B_DIAGNOSTIC_STRATEGY.md`](LR1B_DIAGNOSTIC_STRATEGY.md) | Targeted diagnostic workflow for isolating repeatable LR-1B failures before another full acceptance run. |
| [`decisions/README.md`](decisions/README.md) | ADR index and decision-history route. |
| [`CHANGELOG.md`](CHANGELOG.md) | Curated significant product/platform/security/cross-system milestones. |
| [`TECHNICAL_WORK_LOG.md`](TECHNICAL_WORK_LOG.md) | Preserved historical engineering record through ADR-0069; no longer routine per-implementation bookkeeping. |

## Domain routing table

Use this table to identify the smallest safe context packet. Add or refine a row when a meaningful domain is introduced; do not make every domain document mandatory reading.

| Domain / task | Current-state documentation | Primary implementation area | Decision / coordination route |
| --- | --- | --- | --- |
| User access / Admin security / authenticated email | `ADMIN_ACCESS_AUDIT_HISTORY_V1.md`, `AUTH_EMAIL_CHANGE_V1.md`, Architecture auth/access sections | `apps/api/src/users`, `apps/web/app/profile`, auth/roles boundaries | ADR-0013, ADR-0014, ADR-0068, ADR-0070; Supabase ADRs as applicable |
| Work Orders / staffing / execution | Work Order access, execution scope/evidence/correction documents; Architecture current Work Order sections | API Work Order/Technician modules; `apps/web/app/work-orders`, `/technician` | ADR-0021 onward for affected Work Order capability; load only relevant ADRs |
| Service scope / controlled inputs | `CANONICAL_SERVICE_SCOPE_PRICING_V1.md`, `CONTROLLED_INPUT_FIELD_AUDIT.md`, `CONTROLLED_INPUT_RESIDUAL_REVIEW_2026-08-20.md`, focused selector/scope docs | Services, scope templates, Work Order/Shift selectors | ADR-0017/0018/0029 plus focused newer ADRs when relevant |
| Recurring services | `RECURRING_LIFECYCLE_REVIEW_V1.md`, relevant Architecture current section | recurring-service-agreements API/web | ADR-0026, ADR-0066 |
| Website Quote integration | Quote contract/mapping/current-state docs | Quote/integration modules | Issue #73 + relevant Quote ADRs |
| Secure customer Quote access / delivery / response | `SECURE_CUSTOMER_QUOTE_ACCESS_V1.md` | future Quote customer-access/public projection + existing Quote/Correspondence boundaries | ADR-0027, ADR-0037–0041, ADR-0071–0074, ADR-0089; Issue #116 only for bounded manual-WhatsApp/provider interaction |
| Website enquiries | `WEBSITE_ENQUIRY_REFERENCE_AUTHORITY.md` | enquiries/integration modules | Issue #73 and applicable Website-integration ADRs |
| Messaging / WhatsApp / Messenger | `MESSAGING_FOUNDATION_V1.md`, `MESSAGING_QUOTE_STATE_V1.md`, `MESSAGING_WHATSAPP_QUOTE_FLOW_V1.md`, `WHATSAPP_QUOTE_FLOW_RUNTIME_V1.md`, `WHATSAPP_QUOTE_FLOW_MAPPING_SUBMISSION_V1.md`, `WHATSAPP_QUOTE_FLOW_NON_PHOTO_PILOT_V1.md`, `WHATSAPP_BUSINESS_OPERATIONS_V1.md`, `contracts/HOMENT_QUOTE_REQUEST_V1.json`, `contracts/HOMENT_QUOTE_REQUEST_V1_FIXTURES.json` | messaging modules/adapters; Flow artifact generator | ADR-0048–0052, ADR-0078–0084, ADR-0088; Issue #116 |
| Work Order access recovery | `WORK_ORDER_ACCESS_OPERATIONS_V1.md`, `WORK_ORDER_ACCESS_RECOVERY_V1.md` | Work Order access + messaging recovery | ADR-0058–0061; Issue #116 when provider/shared messaging changes |
| Needs Attention / Supervisor operations | Needs Attention and Supervisor focused docs; Architecture current section | attention/dashboard/supervisor modules and UI | ADR-0053, ADR-0063 |
| Finance | `FINANCIAL_ARCHITECTURE.md` and `financial/` policy documents | Finance runtime when implemented | financial ADRs/policy authority; provider decision when applicable |
| Platform / deployment / CI | `ARCHITECTURE.md`, `DEPLOYMENT.md`, `RECOVERY_GUIDE.md`, `OS_BROWSER_AUDIT_V1.md`, `LR1B_OPERATIONAL_ACCEPTANCE_V1.md`, `LR1B_DIAGNOSTIC_STRATEGY.md`, this router | `.github/workflows`, `scripts`, platform config, browser diagnostics/acceptance | ADR-0001–0012 as relevant, ADR-0067, ADR-0069, ADR-0095, ADR-0096 |

For a task not covered by the table, inspect this directory for the closest current-state domain authority and add a routing row only if the gap would recur.

## Validation and PR documentation policy

Development uses the three-stage workflow in `AGENTS.md` and ADR-0067. Final PR CI retains four mandatory jobs: policy/security/diff, API, web/Cloudflare, and clean/staged PostgreSQL migration replay. No path-based final-gate skipping is introduced by ADR-0069.

Implementation/tooling PRs use `.github/pull_request_template.md` to declare documentation impact. `scripts/validate_documentation.py` verifies that the declaration is complete, rejects high-confidence path/declaration contradictions, and enforces mechanically determinable companion documents. Passing automation is a minimum gate; Stage 2 complete-diff semantic review remains authoritative for whether the declared impacts and documentation are truthful.

The manual HestivaOS browser audit is an additional diagnostic layer documented in `OS_BROWSER_AUDIT_V1.md`. Its authentication setup reports only sanitized stage evidence for Supabase password sign-in and HestivaOS user synchronization when login fails; it must not expose credentials, tokens, response bodies or customer data. Its production-safe project may exercise bounded read-only controls such as list/search inputs, status filters, quote filters, Service Catalogue search, Create Work Order reference searches, blocked native validation including empty Cleaning Job Template submission, Create Work Order with an unmet required selector, and Profile personal/email/password forms, read-only account fields, expandable sections, and local editors whose lookup/reference controls can be exercised and then cancelled or closed without saving. Native-validation checks may use DOM `requestSubmit()` with the intended submitter when a real pointer click is irrelevant to the validation boundary or unreliable because of responsive layout geometry; this preserves browser constraint validation without forcing or bypassing a valid mutation. Production-safe browser specs are covered by the shared source-level mutation guard and must not submit valid operational mutations against production data or account-authentication changes. Browser locators for repeated labels must be scoped to the intended UI region so similarly named form controls cannot produce false audit failures. Client-transition timing uses the real shell navigation path: visible links are clicked normally, and when a target route belongs to a collapsed navigation group the audit opens that disclosure before clicking the rendered child link. Deliberately collapsed navigation is not treated as route failure. Its sanitized timing-summary artifact is required output, so the workflow fails if the expected JSON summary is missing instead of silently succeeding without performance evidence. The browser audit does not replace or weaken the four mandatory PR quality-gate jobs.

LR-1B operational acceptance remains deliberately separate from the production-safe browser audit. `.github/workflows/lr1b-operational-acceptance.yml` retains the manually authorized `full` certification scope, which requires the exact `RUN LR1B ACCEPTANCE` confirmation plus `HESTIVA_LR1B_ACCEPTANCE_ENABLED=true`, and uses distinct ADMIN, SUPERVISOR, Technician Job Leader and Technician member credentials with separate browser storage states. Its role setup remains serial and follows the real product lifecycle: ADMIN authenticates first, controlled workforce identities bootstrap/synchronize through normal sign-in, ADMIN assigns/verifies their intended roles and ACTIVE access through `/admin/settings/user-access`, then fresh role-specific logins create the stored Supervisor/Technician sessions. A failure in any prerequisite stage blocks downstream role-interface scenarios. Bundle 2 Quote acceptance continues to use the real private Website Quote ingestion boundary directly from the CI runner rather than the public Website correspondence path; protected `HESTIVA_LR1B_API_URL` and `HESTIVA_LR1B_WEBSITE_INTEGRATION_SECRET` remain required and no customer/admin email is sent by that ingress step. The workflow uses Node 24 with Node-24-compatible GitHub checkout/setup actions and must never receive Meta provider credentials.

ADR-0096 adds the LR-1B Testing Pipeline v2 deployed-diagnostic lane without weakening certification. During an explicitly approved pre-launch automation window, a `main` push may run the current targeted diagnostic only when repository variable `HESTIVA_LR1B_AUTOMATION_ENABLED` is exactly `true`. Before Playwright starts, production deployment proof is fail-closed and surface-aware: Cloudflare web `/api/revision` must report the exact expected Git SHA; Railway API `/api/v1/ready` must be healthy and report either that exact SHA or an older Git ancestor whose intervening diff contains only explicitly API-lag-safe paths (`apps/web/**`, `docs/**`, `.github/**`, `AGENTS.md`, `README.md`, `.gitignore`). Full Git history is checked out so ancestry and changed paths can be proven. Invalid/unknown revisions, a non-ancestor API revision, unavailable diff history, an unready API, a non-exact web revision, or any intervening change outside the conservative allowlist blocks Playwright. This models Railway's legitimate watched-file deployment skips without forcing unchanged API code to redeploy. Production LR-1B uses one concurrency group so mutation runs do not overlap. Failure-only Playwright traces and screenshots may be retained for three days from disposable acceptance journeys; video remains disabled and browser auth-state files are not uploaded. Diagnostics cannot mark launch acceptance PASS and full LR-1B remains separately manually authorized.

When LR-1B exposes a repeatable failure, the full suite remains the acceptance gate but should not be used as the primary debugger. Follow `LR1B_DIAGNOSTIC_STRATEGY.md`, ADR-0095 and ADR-0096: isolate the smallest real product path that reproduces the failure, retain the same safety boundary and real authenticated UI where applicable, emit only bounded non-secret diagnostics, prove the failing boundary, fix product code, require the normal four PR gates, prove the exact repaired revision is deployed, then rerun the affected diagnostic before returning to the connected bundle and final full acceptance lane.

## Historical and diagnostic material

Historical records are preserved and must not be deleted or rewritten to make the past resemble present state. They are retrieved when relevant rather than loaded by default.

Diagnostic documents such as `API_CONNECTIVITY_AUDIT.md` and focused historical implementation/audit documents remain useful evidence but are not automatically current authorities unless their own scope says so.

The manual `Dependency security audit diagnostic`, `Next.js 16 migration validation`, and `HestivaOS Browser Audit` workflows are diagnostic tools; they are not replacements for required PR quality gates. LR-1B operational acceptance is a separately guarded pre-launch acceptance/certification system, not a normal pull-request CI gate.

## Cross-system routes

- Website ↔ HestivaOS: Issue #73.
- WhatsApp / Facebook Messenger ↔ HestivaOS: Issue #116.

Read `CROSS_SYSTEM_COORDINATION.md` before changing a shared contract. Material cross-system decisions and PR links must be synchronized through the applicable issue; secrets never belong there.

## Periodic reconciliation

Global documentation/ADR/roadmap/cross-system hygiene is reviewed after roughly 10 merged implementation PRs, at a roadmap-phase completion, or monthly during active development, whichever meaningful checkpoint comes first, plus major architecture/provider migrations. Known incorrect canonical documentation is fixed immediately rather than deferred to a checkpoint.

## ADR-0069 pilot

The next 3–5 normal implementation PRs form the measured pilot. Their PR template records documentation-file count, Changelog significance/use, Technical Work Log use, documentation-only correction commits after implementation stabilized, implementation-to-freeze time where observable, final CI time, and any impact-classification dispute/miss. After the pilot, perform the first reconciliation checkpoint and tighten the policy if evidence shows a safety gap.
