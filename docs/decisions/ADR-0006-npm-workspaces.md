# ADR-0006: npm workspaces

Status:
Accepted

Date:
2026-08-07

Context:
The frontend and API share one repository but need independently addressable build, test, and deployment commands.

Decision:
Use the private root package `hestiva-os` with npm workspaces `@hestiva/api` and `@hestiva/web`; deployers operate from the repository root when resolving workspaces.

Consequences:
A single dependency graph and lockfile simplify coordination. Commands must name the intended workspace, and incorrect service root directories can break resolution.

Alternatives considered:
Separate repositories; independent nested installs; alternative monorepo package managers or orchestration tools.

Review trigger:
Review if workspace scale, caching, dependency isolation, or release independence makes the current npm setup inadequate.
