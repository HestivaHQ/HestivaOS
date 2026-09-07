import { Injectable } from '@nestjs/common';
import { QuotePhotoSource, QuotePhotoStatus } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthoritativeQuotePhotoInput } from './quote-submission.service';
import type { QuotePhotoInput } from './website-quote-contract';

const WEBSITE_QUOTE_PHOTO_BUCKET = 'quote-photos';

function configuredStorage(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && serviceRoleKey
    ? createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
}

function safeFailureReason(error: unknown): string {
  if (error instanceof Error && error.name) return error.name.slice(0, 120);
  return 'website_quote_photo_storage_failed';
}

@Injectable()
export class WebsiteQuotePhotoStorageService {
  private readonly storage: SupabaseClient | null;

  constructor() {
    this.storage = configuredStorage();
  }

  async store(submissionId: string, photos: QuotePhotoInput[]): Promise<AuthoritativeQuotePhotoInput[]> {
    const results: AuthoritativeQuotePhotoInput[] = [];
    for (const photo of photos) results.push(await this.storeOne(submissionId, photo));
    return results;
  }

  private async storeOne(submissionId: string, photo: QuotePhotoInput): Promise<AuthoritativeQuotePhotoInput> {
    const transferKey = `website-photo:${submissionId}:${photo.clientPhotoId}`;
    const storagePath = `website/${submissionId}/${photo.clientPhotoId}`;
    const base = {
      transferKey,
      source: QuotePhotoSource.CUSTOMER,
      originalFileName: photo.fileName,
      mimeType: photo.contentType,
      sizeBytes: photo.byteSize,
      url: null,
    };

    if (!this.storage) {
      return {
        ...base,
        status: QuotePhotoStatus.FAILED,
        storagePath: null,
        failureReason: 'private_quote_photo_storage_not_configured',
      };
    }

    try {
      const bytes = Buffer.from(photo.transfer.dataBase64, 'base64');
      const { error } = await this.storage.storage.from(WEBSITE_QUOTE_PHOTO_BUCKET).upload(storagePath, bytes, {
        contentType: photo.contentType,
        upsert: true,
      });
      if (error) throw error;
      return {
        ...base,
        status: QuotePhotoStatus.STORED,
        storagePath: `${WEBSITE_QUOTE_PHOTO_BUCKET}/${storagePath}`,
        failureReason: null,
      };
    } catch (error) {
      return {
        ...base,
        status: QuotePhotoStatus.FAILED,
        storagePath: null,
        failureReason: safeFailureReason(error),
      };
    }
  }
}
