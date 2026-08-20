# ADR-0081: Secure provider media outside immutable message history

- Status: Accepted
- Date: 2026-08-20
- Coordination source: `HestivaHQ/HestivaOS#116`

## Context

The provider-neutral messaging contract already normalizes inbound media references, and authenticated WhatsApp webhooks persist immutable message history before business processing. Meta media download URLs are temporary and authenticated; preserving only the provider media ID does not make customer-supplied media durably available to HestivaOS.

Updating the historical message row after a later media download would weaken ADR-0051's immutable messaging-history boundary. Treating Meta's temporary URL as storage would also make the system dependent on an expiring provider artifact.

## Decision

Authenticated inbound WhatsApp media is secured as a separate durable asset lifecycle linked to the immutable `MessagingMessage` identity.

A media asset is uniquely identified by its message, provider and provider media ID. HestivaOS retrieves fresh Meta metadata, downloads the bytes with the existing API-only credential, verifies provider identity/size/content-type/hash evidence where available, and stores the bytes in the private Supabase `messaging-media` bucket under a deterministic message/media path.

The v1 inbound limit is fixed at 20 MB. Larger provider media fails closed rather than being loaded into API memory.

`PENDING`, `STORED` and `FAILED` asset state is durable and replayable. Webhook replay may retry an incomplete asset but must not duplicate the immutable message or logical media asset. A stored asset is not downloaded again.

Provider temporary URLs, bearer credentials, raw webhook bodies and media bytes are not persisted in the database or application logs by this boundary.

## Consequences

- Immutable message history stays immutable.
- Media remains usable after Meta's temporary download URL expires.
- The Supabase project must provide a private `messaging-media` bucket before production media traffic is enabled.
- Storage failure can cause webhook redelivery, relying on existing message idempotency plus media-asset idempotency to converge safely.
- Any future media-read API requires its own authorization and short-lived-access design; the storage path is not itself a customer-facing URL.
- The fixed 20 MB v1 limit is intentionally narrower than some provider document limits to bound API memory use. Increasing it requires a reviewed streaming/storage design rather than only changing a number.

## Alternatives rejected

### Store the Meta temporary URL

Rejected because it expires and still requires provider authorization.

### Rewrite `attachment_metadata` after download

Rejected because provider media securing is later mutable processing state, not immutable arrival history.

### Make the storage bucket public

Rejected because customer-supplied media can contain private household/property information.

### Accept the provider's maximum document size into API memory

Rejected for v1 because it creates avoidable process-memory and denial-of-service risk.

## Review triggers

Review this ADR before introducing media streaming above 20 MB, browser/customer media access, automated content/OCR/AI analysis, retention/deletion rules, cross-provider asset reuse, or Messenger media storage.
