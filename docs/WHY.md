# Why the production system is structured this way

These explanations summarize current accepted decisions; the ADRs are authoritative records.

## Cloudflare for frontend hosting

Cloudflare Workers can run the Next.js frontend through OpenNext and serve it near users while native Git builds provide a direct path from authoritative `main` to Worker `hestivaos`. This keeps web build and runtime ownership together. **May change:** review if framework compatibility, operating needs, or cost no longer fit.

## Railway for API hosting

Railway provides a managed long-running environment for the NestJS API, root-workspace builds, health checks, configuration, and rollback controls. It separates API lifecycle and database migration concerns from the edge frontend. **May change:** the hosting provider is replaceable if reliability or operational requirements demand it; the legacy hostname will change.

## Supabase for database, authentication, and storage

One managed platform supplies PostgreSQL, user authentication, and object storage, reducing bespoke infrastructure while preserving PostgreSQL access through Prisma. **May change:** individual capabilities can be reassessed as scale, security, or portability needs evolve.

## GitHub as source of truth

`HestivaHQ/HestivaOS` on `main` provides the reviewed, auditable input to both deployment systems. Platform console edits are limited to protected values and controller settings; code/config changes belong in Git. This is an enduring principle even if the source-control vendor changes.

## npm workspaces

The `hestiva-os` root coordinates `@hestiva/api` and `@hestiva/web`, provides one dependency graph, and allows explicit workspace build commands from the repository root. **May change:** tooling can evolve, but monorepo commands must remain deterministic for deployers.

## One deployment authority

Only one controller should automatically deploy a given service. Multiple controllers can race, deploy different environment scopes, obscure provenance, and make rollback unsafe. Cloudflare native Git is therefore the sole active web authority; the GitHub Actions web deployment path has been removed and Railway web auto-deployment is disabled. **Temporary:** the Railway web service itself remains only as a rollback fallback and is planned for removal.
