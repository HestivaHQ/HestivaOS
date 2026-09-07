import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { QuoteSubmissionService } from './quote-submission.service';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION,
  validateWebsiteQuoteSubmissionV1,
  type WebsiteQuoteSubmissionV1,
} from './website-quote-contract';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
  type WebsiteQuoteSubmissionV2,
} from './website-quote-contract-v2';
import { WebsiteQuotePhotoStorageService } from './website-quote-photo-storage.service';
import { resolveWebsiteQuoteReplay } from './website-quote-replay-resolution';

export type WebsiteQuoteSubmission = WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2;

@Injectable()
export class WebsiteQuoteIngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quoteSubmissions: QuoteSubmissionService,
    private readonly quotePhotoStorage: WebsiteQuotePhotoStorageService,
  ) {}

  async ingest(payload: unknown) {
    const submission = this.validate(payload);
    const photos = await this.quotePhotoStorage.store(submission.submissionId, submission.photos);
    const result = await this.quoteSubmissions.submit(
      {
        submissionKey: submission.submissionId,
        submittedAt: submission.submittedAt,
        pricingSubmission: submission,
        structuredData: submission as unknown as Prisma.InputJsonValue,
        submittedActivityMetadata: {
          schemaVersion: submission.schemaVersion,
          submissionId: submission.submissionId,
          quotePhotoCount: photos.length,
          quotePhotoFailureCount: photos.filter((photo) => photo.status === 'FAILED').length,
        },
        photos,
      },
      () => resolveWebsiteQuoteReplay(this.prisma, submission),
    );

    return {
      schemaVersion: submission.schemaVersion,
      submissionId: submission.submissionId,
      ...result,
    };
  }

  private validate(payload: unknown): WebsiteQuoteSubmission {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException({ message: 'Invalid website quote submission.', errors: [{ path: '$', code: 'INVALID_OBJECT', message: 'Website Quote submission must be a JSON object.' }] });
    }

    const schemaVersion = (payload as { schemaVersion?: unknown }).schemaVersion;
    const errors = schemaVersion === WEBSITE_QUOTE_SCHEMA_VERSION
      ? validateWebsiteQuoteSubmissionV1(payload)
      : schemaVersion === WEBSITE_QUOTE_SCHEMA_VERSION_V2
        ? validateWebsiteQuoteSubmissionV2(payload)
        : [{ path: 'schemaVersion', code: 'UNSUPPORTED_VERSION', message: 'Unsupported website quote schema version.' }];

    if (errors.length) {
      throw new BadRequestException({ message: 'Invalid website quote submission.', errors });
    }

    return payload as WebsiteQuoteSubmission;
  }
}
