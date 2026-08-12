import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
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
import { resolveWebsiteQuoteReplay } from './website-quote-replay-resolution';

export type WebsiteQuoteSubmission = WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2;

@Injectable()
export class WebsiteQuoteIngestionService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(payload: unknown) {
    const submission = this.validate(payload);
    const replay = await resolveWebsiteQuoteReplay(this.prisma, submission);

    if (replay.kind === 'REPLAY') {
      return {
        schemaVersion: submission.schemaVersion,
        submissionId: submission.submissionId,
        quoteId: replay.quoteId,
        quoteReference: replay.quoteReference,
        created: false,
        replay: true,
      };
    }

    if (replay.kind === 'CONFLICT') {
      throw new ConflictException('submissionId already exists with a different immutable customer submission.');
    }

    if (replay.kind === 'CORRUPT_EXISTING') {
      throw new ConflictException('Existing quote submission identity is inconsistent and requires Admin review.');
    }

    // QuoteRevision requires authoritative financial totals. Creating a zero-value or
    // website-priced Quote here would violate the HestivaOS pricing ownership boundary.
    // The next Slice 5M sub-slice supplies the authoritative calculator and this service
    // will then create Quote + CUSTOMER_SUBMISSION revision + line items atomically.
    throw new ServiceUnavailableException(
      'Website quote ingestion is authenticated and validated, but authoritative pricing is not active yet.',
    );
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
