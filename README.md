# Hestiva OS

Hestiva OS is a web application and API for running property service operations. It
provides authentication and workflows for customers and properties, work orders,
the service catalogue, cleaning job templates, crews, technicians, and shift
planning. The API is deployed on Railway, while the web application is deployed on
Cloudflare Workers. 

## Prerequisites

- Node.js 24+
- npm 11+
- PostgreSQL 16+

## Start locally

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Web: http://localhost:3000
API health: http://localhost:4000/api/v1/health

## Railway API deployment

Railway deploys the API from the repository root using Nixpacks on Node.js 24. The
Nixpacks install phase runs `npm ci`, and the configured build command is
`npm run build --workspace @hestiva/api`; startup runs `npm run deploy:api`.
That command executes `prisma migrate deploy --schema apps/api/prisma/schema.prisma`
before starting NestJS, so the API does not start when a migration fails.

Set these Railway variables: `DATABASE_URL` for the API database. Verify deployment at
`/api/v1/health` and inspect Railway logs for migration or startup errors. Do not use
`prisma migrate dev`, `prisma db push`, or reset commands in Railway.

The Cloudflare frontend is deployed through the existing GitHub workflow in
`.github/workflows/web-cloudflare.yml`. Configure its existing `API_URL` (or
`NEXT_PUBLIC_API_URL`) plus `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` variables. No secrets are stored in this repository.
