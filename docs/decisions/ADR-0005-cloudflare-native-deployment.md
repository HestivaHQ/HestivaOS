# ADR-0005: Cloudflare native deployment

Status:
Accepted

Date:
2026-08-07

Context:
The frontend had multiple possible deployment paths, creating risk of races, inconsistent variables, and unclear release provenance.

Decision:
Use Cloudflare native Git builds from `main` as the active frontend deployment mechanism. Keep the GitHub Actions Cloudflare workflow disabled.

Consequences:
Cloudflare owns both web build and runtime deployment. Build variables must exist in Cloudflare. Wrangler remains an explicitly authorized recovery tool, not routine automation.

Alternatives considered:
GitHub Actions using Wrangler; Railway web automatic deployment; manual Wrangler deployment for every release.

Review trigger:
Review if native builds cannot provide required controls, provenance, reliability, or build functionality.
