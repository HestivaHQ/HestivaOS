import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  WEBSITE_ENQUIRY_SCHEMA_VERSION,
  validateWebsiteEnquirySubmissionV1,
  type WebsiteEnquirySubmissionV1,
} from './website-enquiry-contract';
import { websiteEnquiryPayloadFingerprint } from './website-enquiry-idempotency';

function johannesburgBusinessDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).replaceAll('-', '');
}

@Injectable()
export class WebsiteEnquiryIngestionService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(payload: unknown) {
    const submission = this.validate(payload);
    const fingerprint = websiteEnquiryPayloadFingerprint(submission);
    const existing = await this.prisma.websiteEnquiry.findUnique({ where: { submissionKey: submission.submissionId } });

    if (existing) {
      if (existing.payloadFingerprint !== fingerprint) {
        throw new ConflictException('submissionId already exists with a different immutable enquiry submission.');
      }
      return this.response(existing.id, existing.reference, submission.submissionId, false, true);
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const businessDate = johannesburgBusinessDate();
        const counter = await tx.enquiryDailyCounter.upsert({
          where: { businessDate },
          create: { businessDate, sequence: 1 },
          update: { sequence: { increment: 1 } },
        });
        if (counter.sequence > 9999) {
          throw new ServiceUnavailableException('The daily Enquiry reference limit has been reached.');
        }

        const reference = `ENQ-${businessDate}-${String(counter.sequence).padStart(4, '0')}`;
        return tx.websiteEnquiry.create({
          data: {
            reference,
            submissionKey: submission.submissionId,
            payloadFingerprint: fingerprint,
            schemaVersion: submission.schemaVersion,
            submittedAt: new Date(submission.submittedAt),
            name: submission.name.trim(),
            phone: submission.phone.trim(),
            email: submission.email.trim().toLowerCase(),
            enquiryType: submission.enquiryType,
            propertyAddress: submission.propertyAddress.trim(),
            description: submission.description.trim(),
            preferredContact: submission.preferredContact.trim(),
            structuredData: submission as unknown as Prisma.InputJsonValue,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return this.response(created.id, created.reference, submission.submissionId, true, false);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrent = await this.prisma.websiteEnquiry.findUnique({ where: { submissionKey: submission.submissionId } });
        if (concurrent && concurrent.payloadFingerprint === fingerprint) {
          return this.response(concurrent.id, concurrent.reference, submission.submissionId, false, true);
        }
        if (concurrent) {
          throw new ConflictException('submissionId was concurrently claimed by a different immutable enquiry submission.');
        }
        throw new ConflictException('Concurrent enquiry creation could not be safely reconciled.');
      }
      throw error;
    }
  }

  private response(enquiryId: string, enquiryReference: string, submissionId: string, created: boolean, replay: boolean) {
    return {
      schemaVersion: WEBSITE_ENQUIRY_SCHEMA_VERSION,
      submissionId,
      enquiryId,
      enquiryReference,
      created,
      replay,
    };
  }

  private validate(payload: unknown): WebsiteEnquirySubmissionV1 {
    const errors = validateWebsiteEnquirySubmissionV1(payload);
    if (errors.length) {
      throw new BadRequestException({ message: 'Invalid website enquiry submission.', errors });
    }
    return payload as WebsiteEnquirySubmissionV1;
  }
}
