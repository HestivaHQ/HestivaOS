import { Injectable } from '@nestjs/common';
import { QuotePhotoSource, QuotePhotoStatus } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthoritativeQuotePhotoInput } from './quote-submission.service';
import type { QuotePhotoInput } from './website-quote-contract';

function configuredStorage(): { client: SupabaseClient; bucket: string } | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return {
    client: createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    bucket: process.env.SUPABASE_WORK_ORDER_PHOTOS_BUCKET?.trim() || 'work-order-photos',
  };
}

function safeFailureReason(error: unknown): string {
  if (error instanceof Error && error.name) return error.name.slice(0, 120);
  return 'website_quote_photo_storage_failed';
}

@Injectable()
export class WebsiteQuotePhotoStorageService {
  private readonly storage: { client: SupabaseClient; bucket: string } | null;

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
    const objectPath = `quote/${submissionId}/${photo.clientPhotoId}`;
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
      const { error } = await this.storage.client.storage.from(this.storage.bucket).upload(objectPath, bytes, {
        contentType: photo.contentType,
        upsert: true,
      });
      if (error) throw error;
      return {
        ...base,
        status: QuotePhotoStatus.STORED,
        storagePath: `${this.storage.bucket}/${objectPath}`,
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
