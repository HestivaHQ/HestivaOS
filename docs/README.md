# Hestiva OS engineering documentation

This directory is the maintained operational and engineering record for Hestiva OS. Update it whenever production topology, deployment ownership, configuration names, recovery procedures, or accepted engineering decisions change. Never place environment-variable values or other secrets here.

## Documentation policy

Documentation is part of the Definition of Done. The repository-wide rules and exact change-to-document matrix are in [`AGENTS.md`](../AGENTS.md); [ADR-0008](decisions/ADR-0008-repository-documentation-policy.md) records the decision. Every implementation must update the verified current-state documents it affects and append the technical work log and changelog. ADRs preserve history and are superseded by later ADRs rather than rewritten.

Pull requests targeting `main` run `.github/workflows/pr-quality-gates.yml`, which includes `scripts/validate_documentation.py` against the PR base and head alongside the repository's other verification gates. After the independent web build, the gate also generates Cloudflare types, builds the OpenNext Worker, and validates the Wrangler bundle with `--dry-run`; it receives no Cloudflare credentials and does not deploy. The documentation validator rejects meaningful implementation changes when nothing under `docs/` changed and prints relevant document guidance. It intentionally ignores Markdown-only edits, README formatting, comment-only code edits, and license changes. Passing automation is only a minimum gate: authors must still apply the complete matrix, verify every statement, and confirm no stale documentation remains.

Run `npm ci` from the repository root before development or verification commands. The root `postinstall` is the single bootstrap owner for Prisma Client generation, so a successful clean install prepares `@prisma/client` types for API typecheck, build, and tests.

The pull-request gate creates isolated PostgreSQL databases and runs `scripts/test_postgres_migrations.sh` from zero and from immediately before Slice 5K. This executable check covers migration ordering and PostgreSQL-specific behavior; its database-name guard prevents accidental use against an ordinary environment.

The temporary `Dependency security audit diagnostic` workflow is available only through manual `workflow_dispatch`. It installs the committed lockfile on Node.js 24, verifies the existing Prisma Client bootstrap, records full, production-only, and JSON npm audit results plus outdated-package diagnostics, and uploads the JSON report for 14 days. It has read-only repository permission, requires no production credentials, does not change dependencies, and does not deploy. Dependency review and remediation remain outstanding until maintainers assess the collected results.

The temporary `Next.js 16 migration validation` workflow is also manual-only. It uses Node.js 24 and the committed lockfile to run Prisma bootstrap verification, root and independent workspace checks, the OpenNext build from the `apps/web` project root, Cloudflare type generation, a Wrangler dry run, and repository documentation/security checks. It has read-only repository permission, accepts no production credentials, and cannot deploy because its only Wrangler invocation includes `--dry-run`. Authenticated runtime route testing remains a separate post-build smoke test, and the workflow's existence does not complete either the migration validation or dependency remediation.

## Document map

| Document | Class | Purpose |
| --- | --- | --- |
| [Architecture](ARCHITECTURE.md) | Architectural | Production components, ownership, and data flow. |
| [Deployment](DEPLOYMENT.md) | Operational | Current Cloudflare and Railway release procedures. |
| [Environment](ENVIRONMENT.md) | Operational | Variable names, scopes, and safe recovery. |
| [Recovery guide](RECOVERY_GUIDE.md) | Operational | Ordered incident diagnosis and recovery. |
| [API connectivity audit](API_CONNECTIVITY_AUDIT.md) | Diagnostic | Verified browser/server request inventory, CORS boundary, and runtime checks. |
| [Technical work log](TECHNICAL_WORK_LOG.md) | Historical | Detailed migration and recovery record. |
| [Roadmap](ROADMAP.md) | Planning | Identified technical follow-up work only. |
| [Changelog](CHANGELOG.md) | Historical | Manually maintained, dated engineering changes. |
| [Why](WHY.md) | Architectural | Current platform and process rationale. |
| [Decision records](decisions/README.md) | Architectural/historical | Index of accepted ADRs and their review triggers. |

Operational documents should match production. ADRs preserve why a choice was made even after it is superseded. The roadmap is not a product commitment; it is a prioritized technical queue. The work log and changelog should not be rewritten to hide past incidents or migrations.

- `QUOTE_TO_OS_VALUE_MAPPING.md` — authoritative current website vocabulary reconciliation and fail-closed input for future quote handoff.
