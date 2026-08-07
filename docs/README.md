# Hestiva OS engineering documentation

This directory is the maintained operational and engineering record for Hestiva OS. Update it whenever production topology, deployment ownership, configuration names, recovery procedures, or accepted engineering decisions change. Never place environment-variable values or other secrets here.

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
