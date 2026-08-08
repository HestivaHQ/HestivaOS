# Production architecture

Hestiva OS is an npm-workspace monorepo owned in GitHub by `HestivaHQ/HestivaOS`; `main` is the default branch and source of truth.

```text
 Users (browser)
       |
       v
 Cloudflare Worker: hestivaos
 Next.js web (@hestiva/web), built with OpenNext
       |  API_URL (server) / NEXT_PUBLIC_API_URL (browser)
       v
 Railway: NestJS API (@hestiva/api) ---- liveness: /api/v1/health
                                      \-- readiness: /api/v1/ready
       |                 |
       | Prisma          | validates Supabase authentication
       v                 v
 Supabase PostgreSQL   Supabase Auth
       ^
       |
 Supabase Storage <---- web uploads/reads authorized assets

 GitHub main --native Git build--> Cloudflare
 GitHub main --automatic deploy--> Railway API
```

## Components and ownership

- **Frontend:** `@hestiva/web` is Next.js 16.3.0 rendered by the Cloudflare Worker `hestivaos` through OpenNext. Cloudflare owns web build execution, edge runtime, static assets, and web observability.
- **API:** `@hestiva/api` is NestJS on Railway. It exposes versioned HTTP routes, lightweight liveness at `/api/v1/health`, and dependency readiness at `/api/v1/ready`. Railway owns API build, process lifecycle, health checks, and API networking. API requests and errors produce structured JSON logs correlated by the response's `X-Request-ID` header.
- **Database:** Supabase PostgreSQL is accessed by the API through Prisma. Prisma migrations run before API process startup.
- **Repository bootstrap:** Root dependency installation runs the root `postinstall` lifecycle, which generates Prisma Client from `apps/api/prisma/schema.prisma` before workspace typecheck, build, or test commands consume `@prisma/client` types. API builds compile the already-generated client rather than generating it again.
- **Authentication:** Supabase Auth issues user credentials; the API validates them with configured Supabase project values. Authentication is not provided by Railway or Cloudflare.
- **Storage:** Supabase Storage holds profile and work-order assets; configured bucket names identify the relevant buckets.
- **Source control:** GitHub repository `HestivaHQ/HestivaOS`, default branch `main`, is the authoritative code history and deployment input.
- **Deployment:** Cloudflare native Git builds are the sole active web deployment authority. The production build environment in Cloudflare owns browser-exposed `NEXT_PUBLIC_*` values, while `apps/web/wrangler.jsonc` owns repository-declared Worker runtime configuration and preserves deliberately platform-managed runtime variables. Railway automatically deploys only the API. The former GitHub Actions web deploy has been removed, Railway web auto-deploy is disabled, and the retained Railway web service is rollback-only.
- **Pull-request verification:** `.github/workflows/pr-quality-gates.yml` verifies pull requests targeting `main` on Node.js 24. It installs the locked root dependency graph, validates documentation, scans tracked files for high-confidence secret formats, type-checks, builds, tests, independently builds both workspaces, and checks patch whitespace. It has read-only repository permission and contains no deployment step or production credentials.
- **Frontend framework compatibility:** Next.js 16 uses its default Turbopack build path. The application has no custom webpack configuration or webpack-injecting plugin. OpenNext 1.20.2 declares compatibility with Next.js 16.3.0. The existing `middleware.ts` remains the Supabase session-refresh and route-protection boundary; Next.js 16 deprecates that convention in favor of `proxy`, so renaming is tracked separately rather than mixed into the security migration.
- **Dependency audit diagnostic:** `.github/workflows/dependency-security-audit.yml` is a temporary, manual-only Node.js 24 diagnostic. It installs the locked dependency graph, verifies the existing Prisma bootstrap, records npm security and outdated-package results, and retains the JSON audit report for 14 days. It has read-only repository permission, receives no production credentials, does not mutate dependencies, and cannot deploy.

## Request and data flow

The browser requests the Cloudflare Worker. Server-rendered web code uses `API_URL`; browser code uses the build-time `NEXT_PUBLIC_API_URL` to call the Railway API. The API applies application rules, validates Supabase identities, and reads or writes Supabase PostgreSQL through Prisma. Web features use Supabase authentication and Storage with public client configuration embedded during the frontend build. `NEXT_PUBLIC_*` values are intentionally browser-visible and require a rebuild when changed. Railway owns API runtime configuration. Secret values remain in each platform's protected settings, never Git.

The current Railway API hostname contains the legacy `mmapi` name. It is an endpoint compatibility detail, not the product or service identity, and is scheduled for migration.
