# ADR-0002: Railway for API hosting

Status:
Accepted

Date:
2026-08-07

Context:
The NestJS API needs a managed Node.js process, root-workspace build support, environment configuration, migrations, health checks, and rollback.

Decision:
Host `@hestiva/api` on Railway, building from the repository root with `npm run build --workspace @hestiva/api`, starting with `npm run deploy:api`, and checking `/api/v1/health`.

Consequences:
API operations are separate from frontend operations. Railway configuration must preserve monorepo resolution, and database migration compatibility must be considered during rollback.

Alternatives considered:
Cloudflare Workers; the former Railway web service pattern; a self-managed container or another application platform.

Review trigger:
Review if Railway cannot meet reliability, networking, scaling, security, or cost requirements. Migrate the legacy `mmapi` hostname without changing this hosting decision.
