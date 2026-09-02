# Login synchronization fast path — 2026-09-02

## Scope

This change reduces the normal returning-user login critical path without changing HestivaOS identity, authorization, access-status, or reconciliation authority.

## Verified bottleneck

After Supabase password authentication succeeds, the web login deliberately calls `POST /api/v1/users/sync` before entering protected office routes. The global API authentication guard already performs all of the following before the sync controller runs:

- cryptographically verifies the Supabase bearer token against the configured JWKS boundary;
- resolves the canonical application `User` by the authenticated Supabase Auth UUID;
- requires `User.status = ACTIVE` when that application user exists;
- attaches that canonical user to the authenticated request.

For an ordinary returning user whose Auth UUID and normalized email have not changed, the sync controller previously discarded that already-resolved user and called `UsersService.sync()`. That service then opened a PostgreSQL `SERIALIZABLE` transaction and repeated the Auth-UUID lookup plus a case-insensitive email search before returning the same application user.

The subsequent protected-route transition still resolves the current application user through read-only `GET /api/v1/users/me` as defined by ADR-0091. That read remains authoritative and is not removed by this change.

## Change

`POST /users/sync` now reuses the guard-resolved application user only when all of these facts match:

1. the guard supplied a canonical current user;
2. that user's `authUserId` equals the verified Supabase subject;
3. the verified Supabase email is present; and
4. the stored and authenticated emails are equal after trim/lowercase normalization.

When those conditions hold, the controller returns the already-authorized user immediately and does not enter the reconciliation transaction.

## Hydration-safe login readiness

The login form also owns an explicit client-readiness boundary. Server-rendered email, password, submit and sign-up/sign-in mode controls remain disabled until React hydration completes. A client effect marks the page hydrated, after which those controls become interactive. The submit handler independently refuses pre-hydration submission as defense in depth.

This prevents a fast browser or user from submitting the server-rendered form before React has attached the `onSubmit` and controlled-input handlers. Before this boundary existed, such an interaction could fall through to native form behavior and remain on `/login` without ever reaching Supabase password authentication.

The readiness boundary does not change Supabase authentication, HestivaOS role/access authority, identity reconciliation, or provider configuration. Acceptance/browser automation should observe the product-owned readiness state by waiting for the real login controls to become enabled rather than inferring hydration from timing, URL stability, auxiliary UI toggles or synthetic submission probes.

## Fail-closed fallback

The existing `UsersService.sync()` reconciliation path remains unchanged and is still used when:

- no application user exists for the current Auth UUID;
- the provider email changed;
- the stored Auth UUID is stale or otherwise mismatched; or
- any other fast-path prerequisite is absent.

That path continues to enforce verified-email requirements for stale-identity reconciliation, ambiguous/conflicting identity handling, database uniqueness, `SERIALIZABLE` transaction semantics, and ACTIVE application access.

## Security boundary

The fast path does not trust browser-supplied role or status data. It only reuses the `User` object produced by the global authentication guard after local bearer verification and canonical database lookup. Roles and access remain HestivaOS application data; Supabase claims remain identity evidence only.

The hydration-ready UI boundary prevents authentication interaction before the client authentication handler is live; it does not replace server-side authentication or authorization controls.

## Verification

Focused controller tests cover:

- unchanged Auth UUID + normalized email returns the guard-resolved user without invoking `UsersService.sync()`;
- provider email change delegates to the full reconciliation path; and
- missing application user delegates to the full reconciliation path.

LR-1B source regression coverage requires the login page to expose the product-owned hydration-ready state and requires role authentication setup to wait for enabled login controls without synthetic hydration probes.

Full API, web/Cloudflare, documentation/policy, secret, diff, and PostgreSQL migration replay gates remain required before merge. Because this changes the authentication/login path, the deployed HestivaOS Browser Audit and affected LR-1B authentication scenarios must be rerun after merge.
