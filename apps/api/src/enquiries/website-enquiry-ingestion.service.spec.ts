import { ConflictException } from '@nestjs/common';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { WebsiteEnquiryIngestionService } from './website-enquiry-ingestion.service';
import { WEBSITE_ENQUIRY_SCHEMA_VERSION } from './website-enquiry-contract';
import { websiteEnquiryPayloadFingerprint } from './website-enquiry-idempotency';

const submission = {
  schemaVersion: WEBSITE_ENQUIRY_SCHEMA_VERSION,
  submissionId: '2eaa0a85-3480-4c6d-8db2-04cfefb451ec',
  submittedAt: '2026-08-19T06:00:00.000Z',
  name: 'Example Customer',
  phone: '+27 82 000 0000',
  email: 'customer@example.com',
  enquiryType: 'General Enquiry' as const,
  propertyAddress: 'Centurion',
  description: 'Please contact me about your services.',
  preferredContact: 'WhatsApp' as const,
};

type MockTransaction = {
  enquiryDailyCounter: { upsert: ReturnType<typeof jest.fn> };
  websiteEnquiry: { create: ReturnType<typeof jest.fn> };
};

function createEnquiryMock() {
  return jest.fn(async (...args: unknown[]) => {
    const [{ data }] = args as [{ data: Record<string, unknown> }];
    return { id: '6ab4f479-34cc-42f9-a0a6-2d7e884b7222', ...data };
  });
}

function transactionMock(tx: MockTransaction) {
  return jest.fn(async (...args: unknown[]) => {
    const [callback] = args as [(transaction: MockTransaction) => unknown];
    return callback(tx);
  });
}

describe('WebsiteEnquiryIngestionService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the existing authoritative reference for an identical retry', async () => {
    const prisma = {
      websiteEnquiry: {
        findUnique: jest.fn().mockResolvedValue({
          id: '6ab4f479-34cc-42f9-a0a6-2d7e884b7222',
          reference: 'ENQ-20260819-0001',
          payloadFingerprint: websiteEnquiryPayloadFingerprint(submission),
        } as never),
      },
    } as any;
    const service = new WebsiteEnquiryIngestionService(prisma);

    await expect(service.ingest(submission)).resolves.toMatchObject({
      enquiryReference: 'ENQ-20260819-0001',
      created: false,
      replay: true,
    });
  });

  it('rejects reuse of a submission id with different immutable content', async () => {
    const prisma = {
      websiteEnquiry: {
        findUnique: jest.fn().mockResolvedValue({
          id: '6ab4f479-34cc-42f9-a0a6-2d7e884b7222',
          reference: 'ENQ-20260819-0001',
          payloadFingerprint: 'different',
        } as never),
      },
    } as any;
    const service = new WebsiteEnquiryIngestionService(prisma);

    await expect(service.ingest(submission)).rejects.toBeInstanceOf(ConflictException);
  });

  it('allocates an ENQ reference and persists the accepted enquiry atomically', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-19T06:00:00.000Z'));
    const tx: MockTransaction = {
      enquiryDailyCounter: {
        upsert: jest.fn().mockResolvedValue({ businessDate: '20260819', sequence: 7 } as never),
      },
      websiteEnquiry: { create: createEnquiryMock() },
    };
    const prisma = {
      websiteEnquiry: { findUnique: jest.fn().mockResolvedValue(null as never) },
      $transaction: transactionMock(tx),
    } as any;
    const service = new WebsiteEnquiryIngestionService(prisma);

    await expect(service.ingest(submission)).resolves.toMatchObject({
      enquiryReference: 'ENQ-20260819-0007',
      created: true,
      replay: false,
    });
    expect(tx.websiteEnquiry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reference: 'ENQ-20260819-0007', submissionKey: submission.submissionId }),
    }));
  });

  it('uses the Johannesburg business date when allocating the reference', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-19T22:30:00.000Z'));
    const tx: MockTransaction = {
      enquiryDailyCounter: {
        upsert: jest.fn().mockResolvedValue({ businessDate: '20260820', sequence: 1 } as never),
      },
      websiteEnquiry: { create: createEnquiryMock() },
    };
    const prisma = {
      websiteEnquiry: { findUnique: jest.fn().mockResolvedValue(null as never) },
      $transaction: transactionMock(tx),
    } as any;
    const service = new WebsiteEnquiryIngestionService(prisma);

    await expect(service.ingest(submission)).resolves.toMatchObject({
      enquiryReference: 'ENQ-20260820-0001',
    });
    expect(tx.enquiryDailyCounter.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { businessDate: '20260820' },
    }));
  });

  it('reconciles a concurrent duplicate to the already committed authoritative reference', async () => {
    const fingerprint = websiteEnquiryPayloadFingerprint(submission);
    const concurrent = {
      id: '6ab4f479-34cc-42f9-a0a6-2d7e884b7222',
      reference: 'ENQ-20260819-0004',
      payloadFingerprint: fingerprint,
    };
    const uniqueConflict = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['submission_key'] },
    });
    const prisma = {
      websiteEnquiry: {
        findUnique: jest.fn().mockResolvedValueOnce(null as never).mockResolvedValueOnce(concurrent as never),
      },
      $transaction: jest.fn().mockRejectedValue(uniqueConflict as never),
    } as any;
    const service = new WebsiteEnquiryIngestionService(prisma);

    await expect(service.ingest(submission)).resolves.toMatchObject({
      enquiryReference: 'ENQ-20260819-0004',
      created: false,
      replay: true,
    });
  });
});
