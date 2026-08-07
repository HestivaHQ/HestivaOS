# ADR-0004: GitHub as source of truth

Status:
Accepted

Date:
2026-08-07

Context:
Deployments need one reviewed and auditable code history rather than divergent platform copies or console-authored application configuration.

Decision:
Use `HestivaHQ/HestivaOS` and default branch `main` as the authoritative source for application and deployment code. Keep secret values in protected platform settings.

Consequences:
Deployments can be traced to commits and reviewed changes. Platform-side code drift is invalid; protected values and control-plane switches remain outside Git.

Alternatives considered:
Platform-edited source, mirrored repositories with equal authority, or artifact-only source management.

Review trigger:
Review if repository ownership or source-control provider changes, while retaining a single auditable source-of-truth principle.
