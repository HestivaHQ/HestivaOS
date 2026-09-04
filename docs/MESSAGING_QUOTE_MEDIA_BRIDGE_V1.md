# Messaging Quote Media Bridge v1

Status: IMPLEMENTED on the review branch; canonical only after merge.

## Purpose

Promote customer images that have already been secured from authenticated WhatsApp inbound media into the authoritative HestivaOS Quote evidence model without making provider URLs or private storage public.

## Collection boundary

The deterministic Messaging Quote final-details flow keeps photos optional. While the `PHOTOS` question is active:

- a WhatsApp inbound `MEDIA` message is eligible only when the existing inbound-media service has already produced a `STORED` `messaging_media_assets` row for the exact immutable inbound message;
- only `image/*` media is accepted as Quote photo evidence;
- the selected durable media-asset UUIDs are stored only as mutable Messaging Quote workflow provenance;
- each accepted image advances the Quote-state version and sends a fresh version-bound photo prompt;
- after at least one image, the customer must reply exact uppercase `DONE` to finish photo collection;
- when no image is selected, exact `0` continues without photos;
- Messenger media attachment remains disabled because Messenger does not yet have the reviewed secure inbound-media storage boundary required by ADR-0081.

A correction of the Safety / notes / photos section clears any prior selected Messaging media asset IDs together with the stale photo fact group.

## Canonical promotion

Immediately before authoritative Quote creation, every selected asset is re-resolved from PostgreSQL and must still:

- belong to a message in the same Messaging conversation;
- use the reviewed Meta WhatsApp provider boundary;
- have `STORED` status;
- be an `image/*` object;
- have a non-empty private storage path; and
- have a safe positive byte size within the existing 20 MB inbound-media ceiling.

A stale, malformed, cross-conversation, non-image, failed, or missing asset fails closed and cannot become Quote evidence.

The shared `QuoteSubmissionService` receives canonical photo descriptors and creates the `QuotePhoto` rows in the same PostgreSQL `SERIALIZABLE` transaction as the new `Quote` and initial `CUSTOMER_SUBMISSION` revision. Each promoted photo:

- uses `QuotePhotoSource.CUSTOMER`;
- starts as `QuotePhotoStatus.STORED` because the object was already secured before collection;
- carries a deterministic unique transfer key `messaging-media:<asset-uuid>`;
- points at an internal `messaging-media/...` private storage locator;
- has no public URL; and
- is linked to the initial Quote revision.

The transaction also appends `PHOTO_ADDED` Quote activity evidence. If Quote creation rolls back, the QuotePhoto rows roll back with it. A timeout/retry therefore cannot leave a canonical Quote committed without its selected photo records.

## Blob ownership and privacy

v1 does not duplicate the secured bytes into a second storage object. The existing private `messaging-media` object remains the stored blob while `QuotePhoto` becomes the authoritative business-domain owner/reference after submission. Downstream Work Orders continue to reference Quote evidence through `WorkOrderQuoteEvidence` rather than copying blobs.

The internal storage locator is not a customer-facing URL and must not be rendered as one. `SUPABASE_SERVICE_ROLE_KEY`, Meta bearer credentials, temporary provider download URLs, raw webhook bodies, and media bytes remain outside Quote structured data, logs, and browser code.

## Replay identity

The immutable Messaging Quote structured-data provenance records only the resulting Quote photo transfer keys, not private object paths or bytes. That makes the selected photo set part of Messaging submission replay comparison. A retry with the same confirmation and same selected evidence is replay-safe; different selected evidence under the same logical submission identity conflicts rather than silently mutating the original Quote.

## Scope exclusions

This slice does not add Messenger secure inbound-media storage, customer/browser photo viewing, signed URLs, AI/OCR/content classification, antivirus scanning, retention/deletion automation, provider-side deletion, public storage, or Quote revision photo editing after submission. Submitted Quote changes continue through the canonical Quote revision/review workflow.
