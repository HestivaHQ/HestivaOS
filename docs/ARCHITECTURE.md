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
 Railway: NestJS API (@hestiva/api) ---- health: /api/v1/health
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

- **Frontend:** `@hestiva/web` is Next.js rendered by the Cloudflare Worker `hestivaos` through OpenNext. Cloudflare owns web build execution, edge runtime, static assets, and web observability.
- **API:** `@hestiva/api` is NestJS on Railway. It exposes versioned HTTP routes and the `/api/v1/health` readiness endpoint. Railway owns API build, process lifecycle, health checks, and API networking.
- **Database:** Supabase PostgreSQL is accessed by the API through Prisma. Prisma migrations run before API process startup.
- **Authentication:** Supabase Auth issues user credentials; the API validates them with configured Supabase project values. Authentication is not provided by Railway or Cloudflare.
- **Storage:** Supabase Storage holds profile and work-order assets; configured bucket names identify the relevant buckets.
- **Source control:** GitHub repository `HestivaHQ/HestivaOS`, default branch `main`, is the authoritative code history and deployment input.
- **Deployment:** Cloudflare native Git builds are the sole active web deployment authority. Railway automatically deploys only the API. The disabled GitHub Actions web deploy and disabled Railway web auto-deploy are not authorities; the retained Railway web service is rollback-only.

## Request and data flow

The browser requests the Cloudflare Worker. Server-rendered web code uses `API_URL`; browser code uses `NEXT_PUBLIC_API_URL` to call the Railway API. The API applies application rules, validates Supabase identities, and reads or writes Supabase PostgreSQL through Prisma. Web features use Supabase authentication and Storage with public client configuration. Secret values remain in each platform's environment settings, never Git.

The current Railway API hostname contains the legacy `mmapi` name. It is an endpoint compatibility detail, not the product or service identity, and is scheduled for migration.
