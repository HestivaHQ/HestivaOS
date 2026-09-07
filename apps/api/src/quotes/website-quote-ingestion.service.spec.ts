import { describe, expect, it } from '@jest/globals';
import { QuoteActivityType, QuotePhotoSource, QuotePhotoStatus, QuoteStatus } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import type { QuoteOperationalCostProvider } from './quote-operational-cost-source';
import { QuoteSubmissionService } from './quote-submission.service';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION,
  WEBSITE_QUOTE_SOURCE,
  type WebsiteQuoteSubmissionV1,
} from './website-quote-contract';
import type { WebsiteQuotePhotoStorageService } from './website-quote-photo-storage.service';
import { WebsiteQuoteIngestionService } from './website-quote-ingestion.service';

function validReviewRequiredPayload(): WebsiteQuoteSubmissionV1 {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION,
    submissionId: '123e4567-e89b-42d3-a456-426614174000',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-08-15T14:30:00.000Z',
    customer: {
      fullName: 'Review Required Customer',
      email: 'review@example.com',
      mobile: '+27821234567',
      preferredContact: 'WHATSAPP',
    },
    property: {
      propertyType: 'HOUSE',
      suburb: 'Sandton',
      addressLine1: '1 Example Street',
      country: 'South Africa',
      floorSize: 'FROM_300_UP',
      bedrooms: 'FOUR',
      bathrooms: 'THREE',
      livingAreas: 'TWO',
      outdoorArea: 'NONE',
      estateClassification: 'NONE',
      storeys: 'TWO',
    },
    request: {
      primaryService: {
        websiteValue: 'Regular Home Cleaning',
        canonicalService: 'Regular Home Cleaning',
      },
      frequency: 'ONE_TIME',
      homeCondition: 'STANDARD',
      addOns: [],
      ecoFriendlyProducts: false,
    },
    visit: {
      preferredDate: '2026-08-20',
      preferredTime: 'MORNING',
      flexibility: 'Flexible by one day',
      urgency: 'Normal',
    },
    access: {
      complexAccess: 'NOT_APPLICABLE',
      keyHandover: 'SOMEONE_WILL_OPEN',
      someonePresent: true,
    },
    household: {
      hasPets: false,
    },
    safety: {},
    notes: {},
    photos: [],
  };
}

describe('WebsiteQuoteIngestionService', () => {
  it('persists a valid review-required quote through the shared Quote submission authority', async () => {
    let createdData: Record<string, unknown> | undefined;

    const transactionClient = {
      quoteDailyCounter: {
        async upsert() {
          return { sequence: 1 };
        },
      },
      quote: {
        async create(args: { data: Record<string, unknown> }) {
          createdData = args.data;
          return {
            id: 'quote-id-1',
            reference: 'Q-20260815-0001',
            status: QuoteStatus.NEEDS_ATTENTION,
            revisions: [],
          };
        },
      },
    };

    const prisma = {
      quote: {
        async findUnique() {
          return null;
        },
      },
      async $transaction<T>(callback: (tx: typeof transactionClient) => Promise<T>) {
        return callback(transactionClient);
      },
    } as unknown as PrismaService;

    const costProvider: QuoteOperationalCostProvider = {
      async resolve() {
        return {
          provenance: {
            labourMinor: 'approved-labour-matrix:v1;review-required',
          },
        };
      },
    };

    const quoteSubmissions = new QuoteSubmissionService(prisma, costProvider);
    const photoStorage = { async store() { return []; } } as unknown as WebsiteQuotePhotoStorageService;
    const service = new WebsiteQuoteIngestionService(prisma, quoteSubmissions, photoStorage);
    const result = await service.ingest(validReviewRequiredPayload());

    expect(result).toEqual(
      expect.objectContaining({
        quoteReference: 'Q-20260815-0001',
        quoteStatus: QuoteStatus.NEEDS_ATTENTION,
        created: true,
        replay: false,
      }),
    );

    expect(createdData).toEqual(
      expect.objectContaining({
        status: QuoteStatus.NEEDS_ATTENTION,
      }),
    );

    const activities = (createdData?.activities as { create?: Array<Record<string, unknown>> })?.create;
    expect(activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: QuoteActivityType.NEEDS_ATTENTION_SET,
          newStatus: QuoteStatus.NEEDS_ATTENTION,
        }),
      ]),
    );

    const submittedActivity = activities?.find(
      (activity) => activity.type === QuoteActivityType.QUOTE_SUBMITTED,
    );
    expect(submittedActivity?.metadata).toEqual(
      expect.objectContaining({
        schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION,
        submissionId: validReviewRequiredPayload().submissionId,
        quotePhotoCount: 0,
        quotePhotoFailureCount: 0,
      }),
    );

    const needsAttentionActivity = activities?.find(
      (activity) => activity.type === QuoteActivityType.NEEDS_ATTENTION_SET,
    );
    expect(needsAttentionActivity?.metadata).toEqual(
      expect.objectContaining({
        operationalCosts: expect.objectContaining({
          missing: expect.arrayContaining(['deploymentMinor', 'minimumContributionMinor']),
        }),
      }),
    );
  });

  it('passes secured Website photo evidence into the canonical Quote submission authority', async () => {
    const payload = validReviewRequiredPayload();
    payload.photos = [{
      clientPhotoId: '223e4567-e89b-42d3-a456-426614174000',
      fileName: 'kitchen.jpg',
      contentType: 'image/jpeg',
      byteSize: 3,
      sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      transfer: { kind: 'UPLOAD', dataBase64: 'YWJj' },
    }];

    let submittedPhotos: unknown;
    const quoteSubmissions = {
      async submit(input: { photos?: unknown }) {
        submittedPhotos = input.photos;
        return { quoteId: 'quote-id-1', quoteReference: 'Q-20260815-0001', quoteStatus: QuoteStatus.SUBMITTED, created: true, replay: false };
      },
    } as unknown as QuoteSubmissionService;
    const photoStorage = {
      async store() {
        return [{
          transferKey: `website-photo:${payload.submissionId}:${payload.photos[0].clientPhotoId}`,
          source: QuotePhotoSource.CUSTOMER,
          status: QuotePhotoStatus.STORED,
          originalFileName: 'kitchen.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 3,
          storagePath: `work-order-photos/quote/${payload.submissionId}/${payload.photos[0].clientPhotoId}`,
          url: null,
          failureReason: null,
        }];
      },
    } as unknown as WebsiteQuotePhotoStorageService;
    const service = new WebsiteQuoteIngestionService({} as PrismaService, quoteSubmissions, photoStorage);

    await service.ingest(payload);

    expect(submittedPhotos).toEqual([
      expect.objectContaining({
        transferKey: `website-photo:${payload.submissionId}:${payload.photos[0].clientPhotoId}`,
        source: QuotePhotoSource.CUSTOMER,
        status: QuotePhotoStatus.STORED,
        storagePath: `work-order-photos/quote/${payload.submissionId}/${payload.photos[0].clientPhotoId}`,
        url: null,
      }),
    ]);
  });
});
