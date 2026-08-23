import { ConflictException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  Prisma,
  QuoteActivityType,
  QuoteLineItemType,
  QuotePhotoSource,
  QuotePhotoStatus,
  QuoteRevisionOrigin,
  QuoteStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  QUOTE_OPERATIONAL_COST_PROVIDER,
  resolveQuoteOperationalCosts,
  type QuoteOperationalCostProvider,
  type QuotePricingSubmission,
} from './quote-operational-cost-source';
import { calculateWebsiteQuotePricing } from './website-quote-pricing';

export type QuoteSubmissionReplayResolution =
  | { kind: 'NEW' }
  | { kind: 'REPLAY'; quoteId: string; quoteReference: string }
  | { kind: 'CONFLICT'; quoteId: string; quoteReference: string }
  | { kind: 'CORRUPT_EXISTING'; quoteId: string; quoteReference: string };

export type QuoteSubmissionReplayResolver = () => Promise<QuoteSubmissionReplayResolution>;

export type AuthoritativeQuotePhotoInput = {
  transferKey: string;
  source: QuotePhotoSource;
  status: QuotePhotoStatus;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number | null;
  storagePath: string | null;
  url: string | null;
  failureReason?: string | null;
};

export type AuthoritativeQuoteSubmissionInput = {
  submissionKey: string;
  submittedAt: string;
  pricingSubmission: QuotePricingSubmission;
  structuredData: Prisma.InputJsonValue;
  submittedActivityMetadata: Prisma.InputJsonObject;
  photos?: AuthoritativeQuotePhotoInput[];
};

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
export class QuoteSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUOTE_OPERATIONAL_COST_PROVIDER)
    private readonly operationalCostProvider: QuoteOperationalCostProvider,
  ) {}

  async submit(
    input: AuthoritativeQuoteSubmissionInput,
    resolveReplay: QuoteSubmissionReplayResolver,
  ) {
    const replay = await resolveReplay();
    if (replay.kind === 'REPLAY') {
      return {
        quoteId: replay.quoteId,
        quoteReference: replay.quoteReference,
        created: false,
        replay: true,
      };
    }
    if (replay.kind === 'CONFLICT') {
      throw new ConflictException('Quote submission identity already exists with different immutable submission data.');
    }
    if (replay.kind === 'CORRUPT_EXISTING') {
      throw new ConflictException('Existing Quote submission identity is inconsistent and requires Admin review.');
    }

    const costResolution = await resolveQuoteOperationalCosts(
      this.operationalCostProvider,
      input.pricingSubmission,
    );
    const pricingResult = costResolution.kind === 'READY'
      ? calculateWebsiteQuotePricing(input.pricingSubmission, costResolution.costs)
      : calculateWebsiteQuotePricing(input.pricingSubmission);
    const quoteStatus =
      costResolution.kind === 'NEEDS_ATTENTION' || pricingResult.attentionReasons.length
        ? QuoteStatus.NEEDS_ATTENTION
        : QuoteStatus.SUBMITTED;
    const validUntil = new Date(input.submittedAt);
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
            submissionKey: input.submissionKey,
            status: quoteStatus,
            currentRevisionNumber: 1,
            validUntil,
            revisions: {
              create: {
                revisionNumber: 1,
                origin: QuoteRevisionOrigin.CUSTOMER_SUBMISSION,
                structuredData: input.structuredData,
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
                    ...input.submittedActivityMetadata,
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
                ...(input.photos ?? []).map((photo) => ({
                  type: QuoteActivityType.PHOTO_ADDED,
                  newStatus: quoteStatus,
                  metadata: {
                    transferKey: photo.transferKey,
                    source: photo.source,
                    mimeType: photo.mimeType,
                    sizeBytes: photo.sizeBytes,
                  } as Prisma.InputJsonValue,
                })),
              ],
            },
          },
          include: {
            revisions: { include: { lineItems: true } },
          },
        });

        if (input.photos?.length) {
          const revision = quote.revisions.find((item) => item.revisionNumber === 1);
          if (!revision) throw new ConflictException('Created Quote revision is missing and requires recovery.');
          await tx.quotePhoto.createMany({
            data: input.photos.map((photo) => ({
              quoteId: quote.id,
              quoteRevisionId: revision.id,
              transferKey: photo.transferKey,
              source: photo.source,
              status: photo.status,
              originalFileName: photo.originalFileName,
              mimeType: photo.mimeType,
              sizeBytes: photo.sizeBytes,
              storagePath: photo.storagePath,
              url: photo.url,
              failureReason: photo.failureReason ?? null,
            })),
          });
        }

        return quote;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return {
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
        const concurrentReplay = await resolveReplay();
        if (concurrentReplay.kind === 'REPLAY') {
          return {
            quoteId: concurrentReplay.quoteId,
            quoteReference: concurrentReplay.quoteReference,
            created: false,
            replay: true,
          };
        }
        if (concurrentReplay.kind === 'CONFLICT') {
          throw new ConflictException('Quote submission identity was concurrently claimed by different immutable submission data.');
        }
        throw new ConflictException('Concurrent Quote creation could not be safely reconciled and requires Admin review.');
      }
      throw error;
    }
  }
}
