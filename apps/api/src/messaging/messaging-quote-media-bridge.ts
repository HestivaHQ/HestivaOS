import { ConflictException } from '@nestjs/common';
import { QuotePhotoSource, QuotePhotoStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';

const WHATSAPP_PROVIDER = 'meta';
const PRIVATE_MEDIA_BUCKET = 'messaging-media';
const MAX_BYTES = 20 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoredMessagingMediaAsset = {
  id: string;
  message_id: string;
  conversation_id: string;
  provider: string;
  provider_media_id: string;
  mime_type: string | null;
  file_name: string | null;
  provider_file_size: bigint | number | string | null;
  storage_path: string | null;
  status: string;
};

export type MessagingQuotePhotoTransfer = {
  transferKey: string;
  source: QuotePhotoSource;
  status: QuotePhotoStatus;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  url: null;
};

function validStoredImage(asset: StoredMessagingMediaAsset): boolean {
  const size = Number(asset.provider_file_size);
  return asset.provider === WHATSAPP_PROVIDER
    && asset.status === 'STORED'
    && typeof asset.mime_type === 'string'
    && asset.mime_type.startsWith('image/')
    && typeof asset.storage_path === 'string'
    && Boolean(asset.storage_path.trim())
    && Number.isSafeInteger(size)
    && size >= 1
    && size <= MAX_BYTES;
}

/**
 * Resolve only already-secured image assets belonging to the exact inbound
 * message/conversation. A non-image or incomplete asset is not accepted as
 * Quote evidence and leaves the guided flow on the photo question.
 */
export async function securedInboundQuoteImageAssetIds(
  prisma: PrismaService,
  messageId: string,
  conversationId: string,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<StoredMessagingMediaAsset[]>`
    SELECT a.id,
           a.message_id,
           m.conversation_id,
           a.provider,
           a.provider_media_id,
           a.mime_type,
           a.file_name,
           a.provider_file_size,
           a.storage_path,
           a.status
    FROM messaging_media_assets a
    INNER JOIN messaging_messages m ON m.id = a.message_id
    WHERE a.message_id = ${messageId}::uuid
      AND m.conversation_id = ${conversationId}::uuid
    ORDER BY a.created_at ASC
  `;

  if (!rows.length || rows.some((asset) => !validStoredImage(asset))) return [];
  return [...new Set(rows.map((asset) => asset.id))];
}

/**
 * Re-resolve every persisted workflow reference immediately before canonical
 * Quote creation. This prevents a stale/cross-conversation asset identifier from
 * becoming Quote evidence merely because it was present in mutable draft state.
 */
export async function messagingQuotePhotoTransfers(
  prisma: PrismaService,
  conversationId: string,
  assetIds: string[],
): Promise<MessagingQuotePhotoTransfer[]> {
  const uniqueIds = [...new Set(assetIds.map((value) => value.trim()).filter(Boolean))];
  const transfers: MessagingQuotePhotoTransfer[] = [];

  for (const assetId of uniqueIds) {
    if (!UUID_PATTERN.test(assetId)) {
      throw new ConflictException('Messaging Quote photo provenance is invalid and requires recovery.');
    }

    const rows = await prisma.$queryRaw<StoredMessagingMediaAsset[]>`
      SELECT a.id,
             a.message_id,
             m.conversation_id,
             a.provider,
             a.provider_media_id,
             a.mime_type,
             a.file_name,
             a.provider_file_size,
             a.storage_path,
             a.status
      FROM messaging_media_assets a
      INNER JOIN messaging_messages m ON m.id = a.message_id
      WHERE a.id = ${assetId}::uuid
        AND m.conversation_id = ${conversationId}::uuid
      LIMIT 1
    `;
    const asset = rows[0];
    if (!asset || !validStoredImage(asset)) {
      throw new ConflictException('Messaging Quote photo evidence is missing, unsafe, or not stored and requires recovery.');
    }

    transfers.push({
      transferKey: `messaging-media:${asset.id}`,
      source: QuotePhotoSource.CUSTOMER,
      status: QuotePhotoStatus.STORED,
      originalFileName: asset.file_name?.trim() || `whatsapp-${asset.id}`,
      mimeType: asset.mime_type!,
      sizeBytes: Number(asset.provider_file_size),
      storagePath: `${PRIVATE_MEDIA_BUCKET}/${asset.storage_path!.replace(/^\/+/, '')}`,
      url: null,
    });
  }

  return transfers;
}
