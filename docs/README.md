# Hestiva OS engineering documentation

This directory is the maintained operational and engineering record for Hestiva OS. Update it whenever production topology, deployment ownership, configuration names, recovery procedures, or accepted engineering decisions change. Never place environment-variable values or other secrets here.

## Documentation policy

Documentation is part of the Definition of Done. The repository-wide rules and exact change-to-document matrix are in [`AGENTS.md`](../AGENTS.md); [ADR-0008](decisions/ADR-0008-repository-documentation-policy.md) records the decision. Every implementation must update the verified current-state documents it affects and append the technical work log and changelog. ADRs preserve history and are superseded by later ADRs rather than rewritten.

Pull requests run `.github/workflows/documentation-policy.yml`, which invokes `scripts/validate_documentation.py` against the PR base and head. It rejects meaningful implementation changes when nothing under `docs/` changed and prints relevant document guidance. The check intentionally ignores Markdown-only edits, README formatting, comment-only code edits, and license changes. Passing automation is only a minimum gate: authors must still apply the complete matrix, verify every statement, and confirm no stale documentation remains.

## Document map

| Document | Class | Purpose |
| --- | --- | --- |
| [Architecture](ARCHITECTURE.md) | Architectural | Production components, ownership, and data flow. |
| [Deployment](DEPLOYMENT.md) | Operational | Current Cloudflare and Railway release procedures. |
| [Environment](ENVIRONMENT.md) | Operational | Variable names, scopes, and safe recovery. |
| [Recovery guide](RECOVERY_GUIDE.md) | Operational | Ordered incident diagnosis and recovery. |
| [Technical work log](TECHNICAL_WORK_LOG.md) | Historical | Detailed migration and recovery record. |
| [Roadmap](ROADMAP.md) | Planning | Identified technical follow-up work only. |
| [Changelog](CHANGELOG.md) | Historical | Manually maintained, dated engineering changes. |
| [Why](WHY.md) | Architectural | Current platform and process rationale. |
| [Decision records](decisions/README.md) | Architectural/historical | Index of accepted ADRs and their review triggers. |

Operational documents should match production. ADRs preserve why a choice was made even after it is superseded. The roadmap is not a product commitment; it is a prioritized technical queue. The work log and changelog should not be rewritten to hide past incidents or migrations.
