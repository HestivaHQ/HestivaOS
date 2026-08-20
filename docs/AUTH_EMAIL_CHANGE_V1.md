# Authenticated Email Change v1

## Current authority

HestivaOS uses Supabase Auth to prove the signed-in identity and the application `User.authUserId` as the stable binding to that identity. Changing an authenticated email must not create a new application User, move authorization authority into Supabase claims, or bypass the existing fail-closed `/users/sync` reconciliation path.

The confirmed application email is updated only when Supabase reports the new email on the authenticated identity and the existing sync flow reconciles that email onto the same application User by `authUserId`.

## User flow

From `/profile`, a signed-in user may request an email change.

1. HestivaOS normalizes the proposed email and runs `POST /api/v1/users/me/email-change/preflight`.
2. The preflight rejects malformed input, the currently confirmed email, and an email already held case-insensitively by another HestivaOS User.
3. If preflight succeeds, the browser calls the signed-in user's normal Supabase `auth.updateUser({ email })` flow. No service-role credential is used or exposed.
4. Supabase sends the provider-managed confirmation email(s). The exact number depends on the project's Secure Email Change setting; the HestivaOS UI does not assume that one confirmation always completes the change.
5. Confirmation may return through Supabase's hosted verification redirect or the repository token-hash `/auth/confirm` route. `email_change` token-hash confirmations default back to `/profile?email-change=confirmed`.
6. On the next protected profile render, the existing server-side `syncUser()` call reconciles the confirmed Supabase email onto the same application User by stable Auth UUID.

## Identity and conflict safety

The preflight is an early usability guard, not an email reservation. A conflicting application User could still appear after preflight but before final confirmation. Therefore the existing `/users/sync` conflict behavior remains authoritative and fail-closed: if the confirmed Auth email conflicts with another HestivaOS User, synchronization must refuse automatic relinking rather than overwrite or merge identities.

No fuzzy identity matching, automatic duplicate merge, provider identity deletion, application-role mutation, or access-status mutation is introduced by this flow.

## Security boundaries

- Only an authenticated user's own Supabase identity can be changed through this profile flow.
- `SUPABASE_SERVICE_ROLE_KEY` is not used by the email-change request.
- HestivaOS does not mark an email confirmed itself; provider confirmation remains authoritative.
- `User.role` and `User.status` remain HestivaOS authorization authority.
- The application User keeps the same primary key and `authUserId` throughout a successful email change.
- Confirmation-return UI describes a confirmation as processed rather than claiming the change is complete until the confirmed email displayed by synchronized application state has changed.

## Recovery and verification

Verify that:

1. the profile shows the currently confirmed application email separately from the proposed new email;
2. same-email, malformed-email, and known HestivaOS-conflict requests fail before Supabase sends a change request;
3. a valid request uses the signed-in Supabase client and produces provider confirmation behavior;
4. `email_change` token-hash confirmation returns safely to the profile;
5. after provider confirmation, `/users/sync` updates the existing application User email by stable `authUserId` without changing role/status;
6. a late email collision remains fail-closed under the existing synchronization rules; and
7. no browser bundle receives a service-role credential.

This flow implements the Phase 1 email-change/confirmation roadmap item without changing the existing Supabase/HestivaOS identity-authority model.
