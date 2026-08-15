import { BadRequestException, ConflictException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  Prisma,
  QuoteActivityType,
  QuoteLineItemType,
  QuoteRevisionOrigin,
  QuoteStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  QUOTE_OPERATIONAL_COST_PROVIDER,
  resolveQuoteOperationalCosts,
  type QuoteOperationalCostProvider,
} from './quote-operational-cost-source';
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
import { calculateWebsiteQuotePricing } from './website-quote-pricing';
import { resolveWebsiteQuoteReplay } from './website-quote-replay-resolution';

export type WebsiteQuoteSubmission = WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2;

function johannesburgBusinessDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).replaceAll('-', '');
}

function quoteLineItemType(code: string): QuoteLineItemType {
  if (code.startsWith('PRIMARY_')) return QuoteLineItemType.PRIMARY_SERVICE;
  if (code.startsWith('ADDON_') || code.startsWith('PREFERENCE_')) return QuoteLineItemType.ADD_ON;
  return QuoteLineItemType.ADJUSTMENT;
}

@Injectable()
export class WebsiteQuoteIngestionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUOTE_OPERATIONAL_COST_PROVIDER)
    private readonly operationalCostProvider: QuoteOperationalCostProvider,
  ) {}

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

    const costResolution = await resolveQuoteOperationalCosts(this.operationalCostProvider, submission);
    const pricingResult = costResolution.kind === 'READY'
      ? calculateWebsiteQuotePricing(submission, costResolution.costs)
      : calculateWebsiteQuotePricing(submission);
    const quoteStatus =
      costResolution.kind === 'NEEDS_ATTENTION' || pricingResult.attentionReasons.length
        ? QuoteStatus.NEEDS_ATTENTION
        : QuoteStatus.SUBMITTED;
    const validUntil = new Date(submission.submittedAt);
    validUntil.setUTCDate(validUntil.getUTCDate() + 30);

    const operationalCostAttention = costResolution.kind === 'NEEDS_ATTENTION'
      ? {
          missing: costResolution.missing,
          invalid: costResolution.invalid,
          provenance: costResolution.provenance,
        }
      : undefined;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const businessDate = johannesburgBusinessDate();
        const counter = await tx.quoteDailyCounter.upsert({
          where: { businessDate },
          create: { businessDate, sequence: 1 },
          update: { sequence: { increment: 1 } },
        });
        if (counter.sequence > 9999) {
          throw new ServiceUnavailableException('The daily Quote reference limit has been reached.');
        }
        const reference = `Q-${businessDate}-${String(counter.sequence).padStart(4, '0')}`;

        const quote = await tx.quote.create({
          data: {
            reference,
            submissionKey: submission.submissionId,
            status: quoteStatus,
            currentRevisionNumber: 1,
            validUntil,
            revisions: {
              create: {
                revisionNumber: 1,
                origin: QuoteRevisionOrigin.CUSTOMER_SUBMISSION,
                structuredData: submission as unknown as Prisma.InputJsonValue,
                currency: pricingResult.pricing.currency,
                subtotalMinor: pricingResult.pricing.subtotalMinor,
                discountMinor: 0,
                taxEnabled: false,
                taxMinor: 0,
                totalMinor: pricingResult.pricing.totalMinor,
                lineItems: {
                  create: [
                    ...pricingResult.pricing.lines.map((item, index) => ({
                      type: quoteLineItemType(item.code),
                      code: item.code,
                      label: item.label,
                      quantity: item.quantity,
                      unitAmountMinor: item.unitAmountMinor,
                      lineTotalMinor: item.lineAmountMinor,
                      sortOrder: index,
                    })),
                    ...(pricingResult.pricing.adjustmentsMinor > 0 ? [{
                      type: QuoteLineItemType.ADJUSTMENT,
                      code: 'PROFITABILITY_FLOOR_ADJUSTMENT',
                      label: 'Profitability safeguard adjustment',
                      quantity: 1,
                      unitAmountMinor: pricingResult.pricing.adjustmentsMinor,
                      lineTotalMinor: pricingResult.pricing.adjustmentsMinor,
                      sortOrder: pricingResult.pricing.lines.length,
                    }] : []),
                  ],
                },
              },
            },
            activities: {
              create: [
                {
                  type: QuoteActivityType.QUOTE_SUBMITTED,
                  newStatus: quoteStatus,
                  metadata: {
                    schemaVersion: submission.schemaVersion,
                    submissionId: submission.submissionId,
                    operationalCostProvenance: costResolution.provenance,
                  } as Prisma.InputJsonValue,
                },
                ...(quoteStatus === QuoteStatus.NEEDS_ATTENTION ? [{
                  type: QuoteActivityType.NEEDS_ATTENTION_SET,
                  newStatus: quoteStatus,
                  metadata: {
                    reasons: pricingResult.attentionReasons,
                    operationalCosts: operationalCostAttention,
                  } as Prisma.InputJsonValue,
                }] : []),
              ],
            },
          },
          include: {
            revisions: { include: { lineItems: true } },
          },
        });

        return quote;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return {
        schemaVersion: submission.schemaVersion,
        submissionId: submission.submissionId,
        quoteId: created.id,
        quoteReference: created.reference,
        quoteStatus: created.status,
        created: true,
        replay: false,
        pricing: pricingResult.pricing,
        attentionReasons: pricingResult.attentionReasons,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrentReplay = await resolveWebsiteQuoteReplay(this.prisma, submission);
        if (concurrentReplay.kind === 'REPLAY') {
          return {
            schemaVersion: submission.schemaVersion,
            submissionId: submission.submissionId,
            quoteId: concurrentReplay.quoteId,
            quoteReference: concurrentReplay.quoteReference,
            created: false,
            replay: true,
          };
        }
        if (concurrentReplay.kind === 'CONFLICT') {
          throw new ConflictException('submissionId was concurrently claimed by a different immutable customer submission.');
        }
        throw new ConflictException('Concurrent quote creation could not be safely reconciled and requires Admin review.');
      }
      throw error;
    }
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
