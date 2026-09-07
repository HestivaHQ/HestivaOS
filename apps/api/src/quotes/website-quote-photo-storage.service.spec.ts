import { afterEach, describe, expect, it } from '@jest/globals';
import { QuotePhotoSource, QuotePhotoStatus } from '@prisma/client';
import { WebsiteQuotePhotoStorageService } from './website-quote-photo-storage.service';

const originalUrl = process.env.SUPABASE_URL;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalUrl;
  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
});

describe('WebsiteQuotePhotoStorageService', () => {
  it('returns durable failed-photo provenance instead of discarding the Quote when private storage is unavailable', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const service = new WebsiteQuotePhotoStorageService();
    const submissionId = '123e4567-e89b-42d3-a456-426614174000';
    const clientPhotoId = '223e4567-e89b-42d3-a456-426614174000';

    const result = await service.store(submissionId, [{
      clientPhotoId,
      fileName: 'kitchen.jpg',
      contentType: 'image/jpeg',
      byteSize: 3,
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      transfer: { kind: 'UPLOAD', dataBase64: 'YWJj' },
    }]);

    expect(result).toEqual([{
      transferKey: `website-photo:${submissionId}:${clientPhotoId}`,
      source: QuotePhotoSource.CUSTOMER,
      status: QuotePhotoStatus.FAILED,
      originalFileName: 'kitchen.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
      storagePath: null,
      url: null,
      failureReason: 'private_quote_photo_storage_not_configured',
    }]);
  });
});
