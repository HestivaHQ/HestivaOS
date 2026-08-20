# WhatsApp Inbound Media Storage v1

## Status

This document records the bounded private-storage boundary for authenticated inbound WhatsApp media. Coordination source: `HestivaHQ/HestivaOS#116`.

## Runtime boundary

The webhook authenticity boundary remains the raw-body Meta signature check. Only after an inbound provider event has been authenticated, normalized and durably persisted may HestivaOS attempt to retrieve referenced media bytes.

For each normalized WhatsApp `MEDIA` item with a Meta media ID, HestivaOS:

1. durably identifies one media asset by `(message_id, provider, provider_media_id)`;
2. retrieves fresh media metadata from the configured Graph API version using the existing API-only WhatsApp access token and phone-number ID;
3. requires the provider metadata ID to match the requested media ID;
4. requires an HTTPS download URL;
5. rejects provider-declared files larger than the fixed v1 limit of 20 MB;
6. downloads the bytes with the same API-only bearer credential;
7. verifies returned content type when supplied, exact byte length, and Meta SHA-256 when supplied;
8. writes the bytes to the private Supabase Storage bucket `messaging-media` at `whatsapp/<message-id>/<provider-media-id>`;
9. persists storage path, provider hash/size, MIME type and lifecycle status in `messaging_media_assets`.

Meta's retrieval response supplies a temporary media URL. Meta's current WhatsApp Business Platform documentation states that this URL expires after approximately five minutes and that the authenticated access token is required to download the bytes. HestivaOS therefore never treats the provider URL itself as durable media storage.

## Replay and failure semantics

The original `messaging_messages` row remains the immutable inbound history record. Media securing is a separate durable asset lifecycle.

A previously stored asset is not downloaded again on webhook replay. A `PENDING` or `FAILED` asset may be retried using the same message/provider media identity. The Supabase path is deterministic and upload uses replacement semantics only for that exact immutable provider-media identity, so a crash after object upload but before database acknowledgement can converge safely on replay.

If private storage, Meta retrieval, integrity verification or upload fails, the webhook request fails. Meta may redeliver the webhook, while messaging-event idempotency prevents a duplicate message record and media-asset identity prevents a duplicate logical asset.

Failure records store only bounded failure classifications/messages. Access tokens, temporary download URLs, raw webhook bodies and media bytes are never written to application logs or database fields by this slice.

## Storage and deployment

The Supabase project must contain a **private** bucket named `messaging-media`. Do not make the bucket public and do not expose the service-role credential to browser/Cloudflare code. Create and verify this private bucket before the matching API revision is allowed to receive production WhatsApp media traffic.

This slice reuses existing API-only configuration:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_GRAPH_API_VERSION`

No new secret or environment variable is introduced.

Deploy additive migration `20260820191500_whatsapp_inbound_media_assets` before the API revision. The migration creates only the media-asset lifecycle table/indexes and a restricted foreign key to immutable messaging history.

After deployment, verify the bucket is private, send a disposable inbound WhatsApp image under 20 MB, confirm one inbound message and one `STORED` media asset are recorded, and verify replay does not create a second logical asset. Do not expose the object path directly to customers or broad projections; any future read endpoint must use an explicitly authorized short-lived access boundary.

## Explicit non-goals

This slice does not add a customer-facing media viewer, broad signed-URL endpoint, antivirus/content classification, OCR, AI media analysis, general-purpose media library, Messenger media, or retention/deletion policy beyond preserving the secured object and provenance. Those require separate approved boundaries.
