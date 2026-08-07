# Environment configuration

This inventory documents names only. Values must never be committed. A `NEXT_PUBLIC_` variable is embedded into browser output at **build time** and is not secret. Server/runtime variables are read by the Worker or API process at **runtime**, although a build may also require them for prerendering.

## Railway API runtime

- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `CORS_ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` (supported API fallback)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (supported API fallback)

## Cloudflare Worker runtime

- `API_URL`

## Cloudflare native build

- `API_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET`
- `NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET`

Build variables must be available during the native Git build. `NEXT_PUBLIC_*` changes require a rebuild and redeploy; changing only runtime configuration will not replace values already compiled into browser assets.

## GitHub Actions secrets (disabled deployment path)

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These names remain documented for the disabled workflow; their presence does not make GitHub Actions a deployment authority.

## Local development

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `API_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET`
- `NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET`

Use ignored local environment files and placeholder-only tracked examples.

## Safely recover Supabase configuration

1. Sign in to the intended Supabase organization and select the production project by its trusted account metadata, not by guessing from a URL.
2. Obtain the project URL and publishable/anonymous client credential from the project's official API settings. Obtain the database connection string from its database connection settings.
3. Store values directly in the appropriate Railway or Cloudflare protected settings. Do not paste them into issues, commits, logs, screenshots, or chat.
4. Confirm bucket **names** in Supabase Storage before configuring the two bucket variables; do not invent buckets.
5. Trigger a new Cloudflare build for build-time values, redeploy/restart Railway for API runtime values, then validate authentication, an API read, and storage access.
6. Rotate any credential that may have been exposed and review platform audit logs.
