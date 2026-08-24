# ADR-0090: Resend transport for Quote correspondence

- Status: Accepted
- Date: 2026-08-24

## Context

HestivaOS now needs to send secure exact-revision Quote correspondence by email while preserving the existing Correspondence subsystem as the durable record and evidence authority. Homent already uses Resend for website email and already has the Homent sending domain verified in that Resend account.

Quote correspondence also needs a dedicated customer-facing mailbox identity. Future Accounting and general operational correspondence will use different mailbox identities, so HestivaOS must not be permanently coupled to one global From address.

## Decision

HestivaOS will reuse Homent's existing Resend account and verified Homent domain as the outbound email provider for Quote correspondence. It will use a **dedicated HestivaOS Resend API key**, separate from the website credential, so either application credential can be independently rotated or revoked.

Resend is a transport adapter only. Existing HestivaOS Correspondence remains authoritative for immutable rendered correspondence, recipient/provenance snapshots, delivery-attempt identity, retry rules and local delivery evidence. Resend provider evidence is attached to those attempts; no parallel email state system is created.

Quote correspondence resolves purpose `QUOTE` to:

- From: `Homent Quotes <quotes@homent.co.za>`
- Reply-To: `quotes@homent.co.za`

The sender resolver is purpose-aware rather than a single global From address. This ADR reserves the architecture for later categories without implementing their workflows:

- Accounting correspondence → `accounts@homent.co.za`
- General operational correspondence → `letyouknow@homent.co.za`

Those later workflows require their own reviewed implementation scope.

The Resend API key and webhook signing secret are separate API-only credentials. Webhook provider evidence is trusted only after verification of the current Resend/Svix raw-body signature contract. Resend `email.opened` and `email.clicked` do not constitute Quote customer-view evidence and are not used to replace the existing secure `VIEW_CONFIRMED` protocol.

The raw secure Quote capability is not stored in Correspondence records, delivery routes, provider evidence, Quote activities or logs. The immutable Correspondence body contains only a secure-link marker; the actual exact-revision bearer URL is injected in process memory at the outbound transport boundary.

## Consequences

- HestivaOS and the website can share the same Resend account/domain while maintaining independent application credentials.
- Credential compromise/rotation can be isolated per application.
- Quote replies can naturally route to the Quote mailbox when `quotes@homent.co.za` exists as a functioning inbound mailbox/alias/routing destination.
- No additional sending domain or DNS architecture is required solely because HestivaOS is a separate application, provided the existing Homent domain remains verified in the same Resend account.
- Provider acceptance/delivery evidence remains semantically separate from secure customer view and response evidence.
- Future sender categories can be added behind the purpose-based sender resolver without changing Correspondence authority or prematurely introducing Accounting/general notification workflows.

## References

- `docs/QUOTE_SEND_TRACKING_V1.md`
- `docs/SECURE_CUSTOMER_QUOTE_ACCESS_V1.md`
- ADR-0089 secure customer Quote access/engagement/response decision
