import { describe, expect, it, jest } from '@jest/globals';
import { QuotePhotoSource, QuotePhotoStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import {
  messagingQuotePhotoTransfers,
  securedInboundQuoteImageAssetIds,
} from './messaging-quote-media-bridge';

const asset = {
  id: '11111111-1111-4111-8111-111111111111',
  message_id: '22222222-2222-4222-8222-222222222222',
  conversation_id: '33333333-3333-4333-8333-333333333333',
  provider: 'meta',
  provider_media_id: 'provider-media-1',
  mime_type: 'image/jpeg',
  file_name: 'kitchen.jpg',
  provider_file_size: BigInt(12345),
  storage_path: 'whatsapp/22222222-2222-4222-8222-222222222222/provider-media-1',
  status: 'STORED',
};

function prismaReturning(rows: unknown[]) {
  return {
    $queryRaw: jest.fn(async () => rows),
  } as unknown as PrismaService;
}

describe('Messaging Quote secured-media bridge', () => {
  it('accepts only an already-STORED WhatsApp image for the exact inbound message', async () => {
    const prisma = prismaReturning([asset]);
    await expect(securedInboundQuoteImageAssetIds(
      prisma,
      asset.message_id,
      asset.conversation_id,
    )).resolves.toEqual([asset.id]);
  });

  it('does not treat non-image or incomplete secured media as Quote photo evidence', async () => {
    await expect(securedInboundQuoteImageAssetIds(
      prismaReturning([{ ...asset, mime_type: 'application/pdf' }]),
      asset.message_id,
      asset.conversation_id,
    )).resolves.toEqual([]);

    await expect(securedInboundQuoteImageAssetIds(
      prismaReturning([{ ...asset, status: 'FAILED', storage_path: null }]),
      asset.message_id,
      asset.conversation_id,
    )).resolves.toEqual([]);
  });

  it('promotes private secured media into canonical QuotePhoto inputs without a public URL', async () => {
    const prisma = prismaReturning([asset]);
    const result = await messagingQuotePhotoTransfers(prisma, asset.conversation_id, [asset.id, asset.id]);

    expect(result).toEqual([{
      transferKey: `messaging-media:${asset.id}`,
      source: QuotePhotoSource.CUSTOMER,
      status: QuotePhotoStatus.STORED,
      originalFileName: 'kitchen.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 12345,
      storagePath: `messaging-media/${asset.storage_path}`,
      url: null,
    }]);
  });

  it('fails closed when mutable draft provenance cannot be re-resolved safely', async () => {
    await expect(messagingQuotePhotoTransfers(
      prismaReturning([]),
      asset.conversation_id,
      [asset.id],
    )).rejects.toThrow('Messaging Quote photo evidence is missing, unsafe, or not stored');

    await expect(messagingQuotePhotoTransfers(
      prismaReturning([]),
      asset.conversation_id,
      ['not-a-uuid'],
    )).rejects.toThrow('Messaging Quote photo provenance is invalid');
  });
});
