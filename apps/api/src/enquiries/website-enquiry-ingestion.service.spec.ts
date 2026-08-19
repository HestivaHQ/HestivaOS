import { ConflictException } from '@nestjs/common';
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
        }),
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
        }),
      },
    } as any;
    const service = new WebsiteEnquiryIngestionService(prisma);

    await expect(service.ingest(submission)).rejects.toBeInstanceOf(ConflictException);
  });

  it('allocates an ENQ reference and persists the accepted enquiry atomically', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-19T06:00:00.000Z'));
    const tx = {
      enquiryDailyCounter: {
        upsert: jest.fn().mockResolvedValue({ businessDate: '20260819', sequence: 7 }),
      },
      websiteEnquiry: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: '6ab4f479-34cc-42f9-a0a6-2d7e884b7222', ...data })),
      },
    };
    const prisma = {
      websiteEnquiry: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
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
});
