# WhatsApp Media Outbound v1

## Status

This document records the bounded WhatsApp Cloud API media-send capability implemented after the authenticated inbound, correlated text outbound, safe retry reconciliation, and provider-status fidelity foundations.

Coordination source: `HestivaHQ/HestivaOS#116`.

## Scope

The WhatsApp adapter may send an already-authorized `OutboundMessagingCommand` with `kind: MEDIA` when all normal WhatsApp outbound configuration is present.

This slice supports exactly one outbound media item per command. The media item must identify exactly one of:

- an existing Meta WhatsApp media ID; or
- an HTTPS media URL that Meta can retrieve.

The command must include a MIME type. The adapter maps only the following bounded media families:

- image: `image/jpeg`, `image/png`;
- video: `video/mp4`, `video/3gpp`;
- audio: `audio/aac`, `audio/mp4`, `audio/mpeg`, `audio/amr`, `audio/ogg`;
- document: `application/*` or `text/*`.

`image/webp` is intentionally not inferred as a sticker because the provider-neutral media contract does not currently carry an explicit sticker role. Unsupported or ambiguous media fails closed before the provider call.

## Provider request rules

The adapter preserves the same outbound safety boundary as text delivery:

- `biz_opaque_callback_data` carries the durable HestivaOS idempotency key;
- provider 5xx/network/malformed-success outcomes remain ambiguous and must be reconciled before retry;
- provider 4xx rejection remains a definite failed attempt;
- a successful response must include the provider message ID.

For images, video and documents, optional command text is used as the provider caption. A document filename is preserved when supplied. Audio does not accept a caption in this boundary.

Media URLs must use HTTPS. A media command with both a provider media ID and URL, neither identifier, multiple media items, or an unsupported MIME type is rejected before any provider request.

## Explicit non-goals

This slice does not:

- upload local HestivaOS files to Meta;
- secure inbound customer media into HestivaOS-owned private storage;
- treat Meta's temporary inbound download URL as durable storage;
- add a general media library;
- implement stickers, contacts, locations, templates, interactive outbound messages, or Messenger media;
- change Customer identity, Quote, Work Order, pricing, correspondence, or AI authority.

Inbound WhatsApp media continues to normalize provider media IDs and supplied metadata. A later storage-focused slice must retrieve provider media, save the bytes to an approved private HestivaOS storage boundary, preserve immutable source provenance, and define retry/retention behavior without rewriting historical messages.

## Current Meta media behavior verified for this slice

Meta's WhatsApp Business Platform media API supports media IDs and link-based media messages. For inbound/provider-held media, the media retrieval endpoint returns a temporary download URL and the authenticated download request must use the access token. Meta's current documentation states that these retrieved media URLs expire after approximately five minutes, which is why such URLs must not be treated as durable HestivaOS storage.
