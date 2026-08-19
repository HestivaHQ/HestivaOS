# Hestiva OS engineering documentation

This directory is the maintained operational and engineering record for Hestiva OS. Update it whenever production topology, deployment ownership, configuration names, recovery procedures, or accepted engineering decisions change. Never place environment-variable values or other secrets here.

## Documentation policy

Documentation is part of the Definition of Done. The repository-wide rules and exact change-to-document matrix are in [`AGENTS.md`](../AGENTS.md); [ADR-0008](decisions/ADR-0008-repository-documentation-policy.md) records the decision. Every implementation must update the verified current-state documents it affects and append the technical work log and changelog. ADRs preserve history and are superseded by later ADRs rather than rewritten.

Repository work performed through the GitHub connector follows the operating sequence defined in `AGENTS.md`: **READ → VERIFY → WRITE → VERIFY → PR**. Existing files must be fetched from the exact target branch before replacement, dependent writes are serialized, important mutations are verified from GitHub before further work depends on them, and a failed connector response is followed by a state re-read before any corrected retry. Routine decision synchronization may batch up to approximately 15 substantive approved decisions, while architecture, security, legal/compliance, infrastructure and cross-system changes are still documented sooner when required.

Development validation follows the repository's **three-stage workflow** recorded in [ADR-0067](decisions/ADR-0067-three-stage-development-validation.md). During active implementation, use proportional high-signal checks for the affected area instead of repeatedly running the entire repository suite. Material architecture, security, business, operational and cross-system decisions still belong in durable repository/coordination sources as soon as another lane could depend on them; only completion-oriented history/final reconciliation may wait until the implementation stabilizes. Once implementation and all required docs/coordination are complete, review the full diff, freeze the exact head and let the required GitHub PR jobs perform authoritative full integration validation. Immediately before merge, verify the exact tested head, current-main/parallel-PR state, append-only history and canonical documentation. A failed gate or later review/security/integration finding reopens the same scoped branch only for the smallest evidenced fix, followed by a new exact-head full validation cycle.

For work that crosses repositories, chats, or external providers, read [`CROSS_SYSTEM_COORDINATION.md`](CROSS_SYSTEM_COORDINATION.md) before making shared-contract changes. It routes Website ↔ HestivaOS work to Issue #73 and WhatsApp/Messenger ↔ HestivaOS work to Issue #116, and defines how cross-system PRs point back to the live coordination record. For backlog selection after the 2026-08-19 reconciliation, also read [`CANONICAL_BACKLOG_FREEZE_2026-08-19.md`](CANONICAL_BACKLOG_FREEZE_2026-08-19.md) so historical plans do not reopen merged foundations.

Pull requests targeting `main` run `.github/workflows/pr-quality-gates.yml` as four independent required jobs: policy/security/diff validation, API validation, web/Cloudflare validation, and PostgreSQL migration replay. The policy job validates documentation against the PR base/head, scans tracked files for high-confidence secrets and runs `git diff --check` without a dependency install. API validation performs the locked install/Prisma bootstrap, API typecheck, full API tests and API production build. Web validation performs the locked install/Prisma bootstrap, web typecheck/tests, Cloudflare type generation, the OpenNext production Worker build and Wrangler `--dry-run`; OpenNext is the authoritative web production build, so the workflow does not run redundant root/standalone web builds first. Migration replay still validates both clean and staged PostgreSQL histories independently. All jobs remain mandatory final gates; there is no path-based final-gate skipping. The documentation validator also requires `docs/CHANGELOG.md` and `docs/TECHNICAL_WORK_LOG.md` for meaningful implementation changes, while the complete `AGENTS.md` matrix remains the richer manual requirement.

The first four-job run on PR #151 completed all gates successfully. GitHub runner provisioning delayed every job by roughly 72 seconds on that sample, so total workflow wall time was not faster than the preceding run; after runners actually started, the parallel validation work completed in roughly 96 seconds versus roughly 152 seconds for the prior sequential `Verify repository` job. Treat that as one measured sample rather than a guaranteed runtime: external runner queueing remains outside repository control, while the repository-controlled execution graph removes duplicate builds and shortens the post-provisioning critical path.

Run `npm ci` from the repository root before development or verification commands that require installed dependencies. The root `postinstall` is the single bootstrap owner for Prisma Client generation, so a successful clean install prepares `@prisma/client` types for API typecheck, build, and tests.

The pull-request gate creates isolated PostgreSQL databases and runs `scripts/test_postgres_migrations.sh` from zero and from immediately before Slice 5K. Staged mode builds a temporary Prisma directory from the checked-in schema and real migration directories whose names sort before the 5K boundary; this repository has no `migration_lock.toml`, so the harness does not invent or require one. The executable check covers migration ordering and PostgreSQL-specific behavior; its database-name guard prevents accidental use against an ordinary environment.

The temporary `Dependency security audit diagnostic` workflow is available only through manual `workflow_dispatch`. It installs the committed lockfile on Node.js 24, verifies the existing Prisma Client bootstrap, records full, production-only, and JSON npm audit results plus outdated-package diagnostics, and uploads the JSON report for 14 days. It has read-only repository permission, requires no production credentials, does not change dependencies, and does not deploy. Dependency review and remediation remain outstanding until maintainers assess the collected results.

The temporary `Next.js 16 migration validation` workflow is also manual-only. It uses Node.js 24 and the committed lockfile to run Prisma bootstrap verification, root and independent workspace checks, the OpenNext build from the `apps/web` project root, Cloudflare type generation, a Wrangler dry run, and repository documentation/security checks. It has read-only repository permission, accepts no production credentials, and cannot deploy because its only Wrangler invocation includes `--dry-run`. Authenticated runtime route testing remains a separate post-build smoke test, and the workflow's existence does not complete either the migration validation or dependency remediation.

## Document map

| Document | Class | Purpose |
| --- | --- | --- |
| [Architecture](ARCHITECTURE.md) | Architectural | Production components, ownership, and data flow. |
| [Cross-system coordination](CROSS_SYSTEM_COORDINATION.md) | Coordination | Routes active shared work to the correct live issue and defines cross-chat/PR synchronization. |
| [Canonical backlog freeze — 2026-08-19](CANONICAL_BACKLOG_FREEZE_2026-08-19.md) | Planning/current-state | Reconciled merged-state inventory, backlog guardrails and dependency-ordered remaining implementation phases. |
| [Financial architecture](FINANCIAL_ARCHITECTURE.md) | Architectural | Financial-domain ownership, recurrence separation, cash-flow planning, and cross-system boundary. |
| [Month-end billing policy](financial/MONTH_END_BILLING_POLICY.md) | Product/financial | Eligibility, billing-date fallback, transition, live statement, and Upcoming Payments requirements. |
| [Collections, refunds and price changes](financial/COLLECTIONS_REFUNDS_AND_PRICE_CHANGES.md) | Product/financial | Expected cash out, overdue state, month-end privilege, and recurring price-change rules. |
| [Customer financial disclosure](financial/CUSTOMER_FINANCIAL_DISCLOSURE.md) | Product/financial | Required customer-facing financial disclosure and preserved recurring-payment terms. |
| [Deployment](DEPLOYMENT.md) | Operational | Current Cloudflare and Railway release procedures. |
| [Environment](ENVIRONMENT.md) | Operational | Variable names, scopes, and safe recovery. |
| [Recovery guide](RECOVERY_GUIDE.md) | Operational | Ordered incident diagnosis and recovery. |
| [API connectivity audit](API_CONNECTIVITY_AUDIT.md) | Diagnostic | Verified browser/server request inventory, CORS boundary, and runtime checks. |
| [Work Order access operations](WORK_ORDER_ACCESS_OPERATIONS_V1.md) | Product/operational | Phase 3C escalation, safe usability, authorization, and lifecycle boundaries. |
| [Work Order access recovery](WORK_ORDER_ACCESS_RECOVERY_V1.md) | Product/security | Phase 3D human-triggered messaging recovery, inbound provenance, and protected review boundary. |
| [Technical work log](TECHNICAL_WORK_LOG.md) | Historical | Detailed migration and recovery record. |
| [Roadmap](ROADMAP.md) | Planning | Verified current implementation queue only. |
| [Changelog](CHANGELOG.md) | Historical | Manually maintained, dated engineering changes. |
| [Why](WHY.md) | Architectural | Current platform and process rationale. |
| [Decision records](decisions/README.md) | Architectural/historical | Index of accepted ADRs and their review triggers. |

Operational documents should match production. ADRs preserve why a choice was made even after it is superseded. The roadmap is not a product commitment; it is a prioritized technical queue. The work log and changelog should not be rewritten to hide past incidents or migrations.

- `QUOTE_TO_OS_VALUE_MAPPING.md` — authoritative current website vocabulary reconciliation and fail-closed input for future quote handoff.
