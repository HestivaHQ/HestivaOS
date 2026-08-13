# ADR-0034: Verify Supabase access tokens locally at the API boundary

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

The global API guard previously validated every protected bearer token by calling Supabase Auth `/auth/v1/user`. HestivaOS screens commonly issue several authenticated API requests, so this placed an external Auth-server round trip in every request's critical path before the application User lookup and endpoint work.

The production Supabase project was verified to use the current asymmetric ECC P-256 signing-key configuration. Supabase publishes the corresponding public JSON Web Keys, allowing the API to verify ES256 access-token signatures without possessing a private signing key or trusting an unverified decoded payload.

## Decision

The NestJS global authentication guard verifies Supabase access tokens locally against the project's public JWKS endpoint. It accepts only ES256 tokens with a signing-key identifier, verifies the signature cryptographically, and validates the expected Supabase issuer, `authenticated` audience, expiry, optional not-before time, and non-empty subject. Public JWKS data is cached in-process for ten minutes. An unknown `kid` triggers one forced JWKS refresh so signing-key rotation can be discovered before normal cache expiry.

Verification remains fail closed. Malformed tokens, unsupported algorithms, unknown signing keys, invalid signatures, invalid issuer/audience, expired tokens, future not-before tokens, JWKS retrieval failures, and missing configuration are unauthorized.

This changes only provider-token verification. ADR-0014 remains authoritative for application access enforcement: the guard still resolves the HestivaOS `User`, rejects non-ACTIVE users, applies route role metadata, and permits the narrow `/users/sync` bootstrap exception for a cryptographically authenticated Supabase identity with no application User.

## Consequences

After JWKS warm-up, normal protected API requests no longer require a Supabase Auth `/user` network request. Supabase remains the authentication identity and signing-key authority. The API stores no Supabase private signing key and does not weaken application authorization.

The API now depends on availability of the public JWKS endpoint when its cache is cold or a new signing key is encountered. During such a failure authentication fails closed rather than accepting unverifiable credentials. Key rotation is supported through `kid` lookup plus forced refresh.

The local verifier is intentionally ES256-specific because that is the verified current production signing configuration. A future signing-algorithm migration requires a reviewed implementation and documentation update rather than silently broadening accepted algorithms.
