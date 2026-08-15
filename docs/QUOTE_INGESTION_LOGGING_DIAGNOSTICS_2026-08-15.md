# Railway structured log visibility fix — 2026-08-15

## Context

During production Website → HestivaOS quote testing, Railway showed blank error rows at the same timestamps as failed quote attempts even though the API was running and `/api/v1/integrations/website/quotes` was mapped.

HestivaOS already routes request failures through `StructuredExceptionFilter`, which records safe structured fields including `event`, request ID, endpoint and HTTP status. The shared `JsonLogger.event()` method emitted those fields as JSON but did not include a top-level `message` property. Railway parses structured JSON logs and can render a blank visible message when that property is absent.

## Change

`JsonLogger.event()` now includes a non-empty `message` derived from the existing safe `event` name. When an event field is absent, it uses the neutral fallback `application_event`.

This preserves the existing structured fields and stack handling while making the record visible in log platforms that display the JSON `message` field.

## Security and behavior preserved

- No quote payload, customer data, bearer secret, environment value or response body is added to logging.
- Website Quote authentication, contract validation, pricing, persistence, status transitions and HTTP responses are unchanged.
- The change is observability-only; it does not convert failures into successes or weaken fail-closed behavior.
- Existing request-failure records continue to include safe endpoint/status metadata and stack data on the server side.

## Verification

Focused Jest coverage verifies that structured error events include `message: request_failed` while retaining the event name, endpoint, status and stack, and that non-event structured records receive the safe fallback message.

After deployment, perform one controlled production quote attempt while Railway runtime logs are open. A failing request should now render a visible event name instead of a blank error row, allowing the existing endpoint/status metadata to identify the rejection boundary.
