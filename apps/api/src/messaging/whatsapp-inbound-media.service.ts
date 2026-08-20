import { Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma.service';
import type { NormalizedInboundMessagingEvent } from './messaging-contract';

const PROVIDER = 'meta';
const MEDIA_BUCKET = 'messaging-media';
const MAX_BYTES = 20 * 1024 * 1024;

type ExistingAsset = { id: string; status: string; storage_path: string | null };
type MetaMediaMetadata = {
  url?: unknown;
  mime_type?: unknown;
  sha256?: unknown;
  file_size?: unknown;
  id?: unknown;
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function safeFailure(error: unknown): string {
  if (error instanceof UnprocessableEntityException) return error.message.slice(0, 240);
  if (error instanceof Error) return error.name.slice(0, 120);
  return 'media_storage_failed';
}

@Injectable()
export class WhatsAppInboundMediaService {
  private readonly storage: SupabaseClient | null;

  constructor(private readonly prisma: PrismaService) {
    const url = env('SUPABASE_URL');
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
    this.storage = url && serviceRoleKey
      ? createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  }

  async secureInboundMedia(messageId: string, event: NormalizedInboundMessagingEvent): Promise<void> {
    if (event.channel !== 'WHATSAPP' || event.provider !== PROVIDER || event.kind !== 'MEDIA' || !event.media?.length) return;
    if (!this.storage) throw new ServiceUnavailableException('Private messaging media storage is not configured.');

    for (const media of event.media) {
      const providerMediaId = media.providerMediaId?.trim();
      if (!providerMediaId) throw new UnprocessableEntityException('Inbound WhatsApp media is missing its provider media ID.');

      const existing = await this.prisma.$queryRaw<ExistingAsset[]>`
        SELECT id, status, storage_path
        FROM messaging_media_assets
        WHERE message_id = ${messageId}::uuid
          AND provider = ${PROVIDER}
          AND provider_media_id = ${providerMediaId}
        LIMIT 1
      `;
      if (existing[0]?.status === 'STORED' && existing[0].storage_path) continue;

      const assetId = existing[0]?.id ?? randomUUID();
      await this.prisma.$executeRaw`
        INSERT INTO messaging_media_assets (
          id, message_id, provider, provider_media_id, mime_type, file_name, status, updated_at
        ) VALUES (
          ${assetId}::uuid, ${messageId}::uuid, ${PROVIDER}, ${providerMediaId}, ${media.mimeType ?? null}, ${media.fileName ?? null}, 'PENDING', CURRENT_TIMESTAMP
        )
        ON CONFLICT (message_id, provider, provider_media_id)
        DO UPDATE SET status = 'PENDING', failure_reason = NULL, updated_at = CURRENT_TIMESTAMP
      `;

      try {
        await this.downloadAndStore(assetId, messageId, providerMediaId, media.fileName);
      } catch (error) {
        await this.prisma.$executeRaw`
          UPDATE messaging_media_assets
          SET status = 'FAILED', failure_reason = ${safeFailure(error)}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${assetId}::uuid
        `;
        throw error instanceof ServiceUnavailableException || error instanceof UnprocessableEntityException
          ? error
          : new ServiceUnavailableException('Inbound WhatsApp media could not be secured.');
      }
    }
  }

  private async downloadAndStore(assetId: string, messageId: string, providerMediaId: string, fallbackFileName?: string): Promise<void> {
    const accessToken = env('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');
    const graphVersion = env('META_GRAPH_API_VERSION');
    if (!accessToken || !phoneNumberId || !graphVersion) {
      throw new ServiceUnavailableException('WhatsApp media retrieval is not configured.');
    }

    const metadataResponse = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(providerMediaId)}?phone_number_id=${encodeURIComponent(phoneNumberId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!metadataResponse.ok) throw new ServiceUnavailableException('WhatsApp media metadata could not be retrieved.');

    const metadata = await metadataResponse.json() as MetaMediaMetadata;
    const downloadUrl = asString(metadata.url);
    const mimeType = asString(metadata.mime_type);
    const providerSha256 = asString(metadata.sha256);
    const providerFileSize = Number(metadata.file_size);
    if (!downloadUrl || !mimeType || asString(metadata.id) !== providerMediaId) {
      throw new UnprocessableEntityException('WhatsApp media metadata is incomplete or inconsistent.');
    }
    const parsedUrl = new URL(downloadUrl);
    if (parsedUrl.protocol !== 'https:') throw new UnprocessableEntityException('WhatsApp media download URL is not HTTPS.');
    if (!Number.isSafeInteger(providerFileSize) || providerFileSize < 0 || providerFileSize > MAX_BYTES) {
      throw new UnprocessableEntityException('WhatsApp media exceeds the 20 MB inbound size limit.');
    }

    const downloadResponse = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!downloadResponse.ok) throw new ServiceUnavailableException('WhatsApp media bytes could not be downloaded.');
    const responseMimeType = downloadResponse.headers.get('content-type')?.split(';')[0]?.trim();
    if (responseMimeType && responseMimeType !== mimeType) {
      throw new UnprocessableEntityException('WhatsApp media content type does not match provider metadata.');
    }

    const bytes = Buffer.from(await downloadResponse.arrayBuffer());
    if (bytes.length !== providerFileSize || bytes.length > MAX_BYTES) {
      throw new UnprocessableEntityException('WhatsApp media byte length does not match provider metadata.');
    }
    if (providerSha256 && createHash('sha256').update(bytes).digest('hex') !== providerSha256.toLowerCase()) {
      throw new UnprocessableEntityException('WhatsApp media integrity verification failed.');
    }

    const storagePath = `whatsapp/${messageId}/${providerMediaId}`;
    const { error } = await this.storage!.storage.from(MEDIA_BUCKET).upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw new ServiceUnavailableException('Private messaging media storage failed.');

    await this.prisma.$executeRaw`
      UPDATE messaging_media_assets
      SET mime_type = ${mimeType},
          file_name = ${fallbackFileName ?? null},
          provider_sha256 = ${providerSha256 ?? null},
          provider_file_size = ${BigInt(providerFileSize)},
          storage_path = ${storagePath},
          status = 'STORED',
          failure_reason = NULL,
          stored_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${assetId}::uuid
    `;
  }
}
