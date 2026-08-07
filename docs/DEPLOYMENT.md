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

### API monitoring endpoints and logs

Railway's health path remains the lightweight `GET /api/v1/health` liveness check. A successful request returns HTTP 200 with this shape (values are illustrative):

```json
{
  "status": "healthy",
  "uptime": 123.45,
  "version": "0.1.0",
  "timestamp": "2026-08-07T00:00:00.000Z"
}
```

Use `GET /api/v1/ready` when an operational check must include dependencies. It verifies the running process and database, and checks the Supabase Auth health endpoint when both a supported Supabase URL and anonymous-key variable are configured. It returns HTTP 200 with `status: "ready"` when required checks pass, or HTTP 503 with `status: "not_ready"` when the database, configured Supabase connection, or partial Supabase configuration is unavailable. An intentionally absent Supabase configuration is reported as `not_configured` and does not by itself make the API unready.

```json
{
  "status": "ready",
  "checks": {
    "process": "healthy",
    "database": "connected",
    "supabase": "connected"
  },
  "timestamp": "2026-08-07T00:00:00.000Z"
}
```

API logs are one JSON object per line. Completed-request records contain timestamp, request ID, HTTP method, path without its query string, response status, and duration in milliseconds. The API accepts a syntactically safe `X-Request-ID` or generates a UUID, echoes it in the response header, and uses it in request and error records. Error records also contain endpoint, stack trace, HTTP status, and environment. Startup success records contain application version, environment, startup duration, listening port, and confirmation status. These records intentionally omit request headers, request/response bodies, query strings, credentials, and environment-variable values.

### Verify and roll back the API

1. Confirm Railway resolved the root `package.json` and installed workspaces.
2. Confirm build and migration logs finish without errors and the process remains running.
3. Request `/api/v1/health` on the configured Railway API hostname and require HTTP 200, then request `/api/v1/ready` and require HTTP 200 with connected dependency checks.
4. Exercise a harmless authenticated API read from the frontend. Confirm its `X-Request-ID` response header matches the structured completion record in Railway logs.
5. If necessary, use Railway to redeploy the last known-good API commit. Database migrations require separate compatibility assessment; never assume an application rollback reverses schema changes.

See the [recovery guide](RECOVERY_GUIDE.md) for symptom-specific procedures and [environment guide](ENVIRONMENT.md) before changing configuration.
