# Deployment

## Frontend: Cloudflare native Git builds

Cloudflare's native Git integration connected to `HestivaHQ/HestivaOS` is the active and single deployment authority for `@hestiva/web`. A change merged to `main` triggers the configured Cloudflare build, which installs the root workspace dependencies and builds the Next.js application with OpenNext for Worker `hestivaos`.

For local verification, from the repository root:

```bash
npm install
npm run typecheck --workspace @hestiva/web
npm run build --workspace @hestiva/web
```

The workspace's verified manual OpenNext deployment command is:

```bash
npm run deploy --workspace @hestiva/web
```

Use it only for an explicitly authorized recovery; routine releases belong to native Git builds. `.github/workflows/web-cloudflare.yml` is disabled at the GitHub control-plane level and must not be treated as an active deployment path. Railway web automatic deployment is disabled. Its web service is temporarily retained only as a rollback option.

### Verify and roll back the frontend

1. Confirm the native build used the intended `main` commit and completed successfully.
2. Open the production web entry point, exercise authentication, and verify a server-rendered and a browser API request.
3. Check Worker logs for HTTP 500 errors and confirm the API health endpoint separately.
4. To roll back, redeploy a previously known-good Cloudflare deployment using Cloudflare's deployment controls. Do not reactivate a second controller. Use the Railway web backup only as an explicitly approved last resort, then restore Cloudflare authority.

## API: Railway

The Railway API service uses the repository root as **Root Directory**. Its checked-in configuration is:

```text
Build command: npm run build --workspace @hestiva/api
Start command: npm run deploy:api
Health path: /api/v1/health
```

The root `deploy:api` command runs `db:migrate:deploy` once and starts `@hestiva/api` only after the migration succeeds. The API workspace `start` script is a pure process start that runs `node dist/main.js`; it does not run migrations itself.

### Verify and roll back the API

1. Confirm Railway resolved the root `package.json` and installed workspaces.
2. Confirm build and migration logs finish without errors and the process remains running.
3. Request `/api/v1/health` on the configured Railway API hostname and require a successful response.
4. Exercise a harmless authenticated API read from the frontend and inspect Railway logs.
5. If necessary, use Railway to redeploy the last known-good API commit. Database migrations require separate compatibility assessment; never assume an application rollback reverses schema changes.

See the [recovery guide](RECOVERY_GUIDE.md) for symptom-specific procedures and [environment guide](ENVIRONMENT.md) before changing configuration.
