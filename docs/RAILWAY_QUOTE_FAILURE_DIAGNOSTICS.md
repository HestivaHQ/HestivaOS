# Railway Quote Failure Diagnostics

## 2026-08-15 production observation

A production Website Quote attempt reached the HestivaOS API after the Railway deployment had completed successfully. Railway showed a visible `request_failed` event immediately followed by `request_completed`, confirming that the API remained running and that the failure occurred within request processing rather than during application startup.

The existing structured logger already retained request ID, endpoint/path, HTTP status and stack information as JSON fields. Railway's rendered log view primarily surfaced the top-level `message`, so the first observability correction made the event name visible but still hid those structured request details in the ordinary log row.

## Current diagnostic behavior

Structured event messages now copy only an explicit safe allowlist into the rendered `message` field:

- HTTP method;
- endpoint or path;
- HTTP status;
- request ID.

Arbitrary structured fields are not copied into the visible message. Quote payload contents, customer information, authentication headers, integration secrets and environment values remain excluded.

This change is observability-only. It does not alter Website Quote authentication, validation, pricing, persistence, replay handling, HTTP response semantics or fail-closed behavior.

## Production verification

After deployment, perform one controlled Website Quote submission while Railway runtime logs are open. A failure should render a line similar to:

`request_failed endpoint=/api/v1/integrations/website/quotes status=<status> requestId=<id>`

The following `request_completed` line should expose the same request ID and HTTP status. Use the status to distinguish validation/authentication/client-contract failures from server-side failures without logging sensitive request data.
