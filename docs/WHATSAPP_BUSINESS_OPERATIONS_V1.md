# WhatsApp Business Operations V1

## Status

**IMPLEMENTED / ADMIN-ONLY** once the required Meta runtime configuration is present.

This document defines the HestivaOS WhatsApp Business operations surface used to inspect message-template state and deliberately send approved template messages through the configured WhatsApp Business Platform account. It is a permanent HestivaOS capability, not an App Review-only diagnostic.

Coordination source: `HestivaHQ/HestivaOS#116`.

## Purpose

HestivaOS needs a small provider-administration surface for WhatsApp capabilities that remain operationally relevant after onboarding and provider review. The first bounded operations are:

1. list message templates for the configured WhatsApp Business Account, including provider status, category and language;
2. send an explicitly selected approved template message to an administrator-supplied WhatsApp recipient using the configured phone-number ID.

The surface is useful for provider setup, template-state verification, controlled template delivery and future production operations. Provider review may exercise the same real product behavior, but review-specific buttons, hard-coded reviewer templates and hard-coded test WABA/phone IDs are intentionally not part of the product contract.

## API boundary

The ADMIN-only API routes are:

- `GET /api/v1/messaging/whatsapp-business/templates`
- `POST /api/v1/messaging/whatsapp-business/template-messages`

Both routes require normal authenticated HestivaOS ADMIN access. Meta credentials remain server-side.

### Template listing

Template listing calls the configured WhatsApp Business Account `message_templates` Graph API edge and returns only the small provider facts needed by the Admin UI:

- template ID when supplied;
- name;
- provider status;
- category when supplied;
- language.

Complete provider payloads and access credentials are not returned to the browser or persisted by this capability.

### Template send

A template send requires:

- recipient WhatsApp number;
- template name;
- language code;
- optional BODY text parameters, supplied in provider order.

Before sending, HestivaOS re-reads the configured WABA's template list and refuses the send unless the exact template name/language pair is currently `APPROVED`. HestivaOS also validates the basic recipient/template/language/parameter shape before calling Meta. A successful provider response must contain a provider message ID; otherwise the request is treated as failed.

This bounded surface currently supports BODY text parameters only. Rich header/button parameter editing is outside V1 and must be added deliberately if a real Homent template requires it.

## Configuration

The operation reuses the existing server-side Meta configuration:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_GRAPH_API_VERSION`

Template listing and the approval recheck used by template sending additionally require:

- `META_WHATSAPP_BUSINESS_ACCOUNT_ID`

The configured WABA must own the phone number represented by `META_WHATSAPP_PHONE_NUMBER_ID`. During the current Meta test phase, both values must identify the corresponding Meta test assets. Switching either value to production is a deliberate provider/deployment change and does not occur merely by using this UI.

See `docs/ENVIRONMENT.md` for the canonical runtime-variable inventory.

## Security and scope

- ADMIN-only application authorization is required.
- Meta access tokens never enter browser-visible code or API responses.
- No production WhatsApp number is registered, migrated, removed or otherwise changed by these operations.
- Listing templates is read-only provider management.
- Sending a template is an explicit outbound provider action and therefore requires deliberate administrator input.
- The API independently verifies that the selected template is currently approved; the browser's disabled options are not treated as an authorization boundary.
- This capability does not weaken WhatsApp webhook authentication, messaging idempotency, Quote authority, customer identity rules or Coexistence onboarding safeguards.

## App Review relationship

Meta App Review should demonstrate the actual HestivaOS product behavior described above rather than a special-purpose certification harness. The same production-intended template listing and template-sending paths may naturally generate the API evidence Meta requires for `whatsapp_business_management` and `whatsapp_business_messaging` while accurately showing the reviewer what Homent intends to operate after approval.
