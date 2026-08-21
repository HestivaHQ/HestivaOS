import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
  calculateAdminReviewedQuotePricing,
  type AdminAddOnReviewDetail,
  type AdminQuoteReviewData,
} from './quote-admin-repricing';
import type { WebsiteQuoteSubmission } from './website-quote-pricing';

export type ReviewQuotePricingInput = {
  expectedRevisionNumber: number;
  addOns?: Array<{ index: number; detail: AdminAddOnReviewDetail }>;
};

type ReviewedSubmission = WebsiteQuoteSubmission & { adminReview?: AdminQuoteReviewData };

function lineItemType(code: string): QuoteLineItemType {
  if (code.startsWith('PRIMARY_')) return QuoteLineItemType.PRIMARY_SERVICE;
  if (code.startsWith('ADDON_') || code.startsWith('PREFERENCE_')) return QuoteLineItemType.ADD_ON;
  return QuoteLineItemType.ADJUSTMENT;
}

function submissionFrom(value: Prisma.JsonValue): ReviewedSubmission {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('request' in value) || !('property' in value)) {
    throw new ConflictException('Quote revision data is incomplete and requires recovery.');
  }
  return value as unknown as ReviewedSubmission;
}

function validatedDetails(input: ReviewQuotePricingInput, addOnCount: number): Record<string, AdminAddOnReviewDetail> {
  if (!Number.isInteger(input.expectedRevisionNumber) || input.expectedRevisionNumber < 1) {
    throw new BadRequestException('A valid current Quote revision number is required.');
  }
  const result: Record<string, AdminAddOnReviewDetail> = {};
  for (const item of input.addOns ?? []) {
    if (!Number.isInteger(item.index) || item.index < 0 || item.index >= addOnCount) {
      throw new BadRequestException('An add-on review index does not match the current Quote revision.');
    }
    if (!item.detail || typeof item.detail !== 'object') throw new BadRequestException('Add-on review detail is required.');
    result[String(item.index)] = {
      ...(item.detail.ovenSize ? { ovenSize: item.detail.ovenSize } : {}),
      ...(item.detail.severeBakedOnGrease !== undefined ? { severeBakedOnGrease: Boolean(item.detail.severeBakedOnGrease) } : {}),
      ...(item.detail.garageSize ? { garageSize: item.detail.garageSize } : {}),
      ...(item.detail.bathroomType ? { bathroomType: item.detail.bathroomType } : {}),
    };
  }
  return result;
}

@Injectable()
export class QuotePricingReviewService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QUOTE_OPERATIONAL_COST_PROVIDER)
    private readonly operationalCostProvider: QuoteOperationalCostProvider,
  ) {}

  async review(id: string, input: ReviewQuotePricingInput, actorUserId: string) {
    if (!actorUserId) throw new BadRequestException('Admin user is required.');

    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        revisions: {
          where: { revisionNumber: input.expectedRevisionNumber },
          include: { lineItems: true },
        },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found.');
    if (quote.status !== QuoteStatus.NEEDS_ATTENTION && quote.status !== QuoteStatus.SUBMITTED) {
      throw new ConflictException(`${quote.status} Quote cannot be revised.`);
    }
    if (quote.currentRevisionNumber !== input.expectedRevisionNumber) {
      throw new ConflictException(`Quote changed. Current revision is ${quote.currentRevisionNumber}.`);
    }

    const current = quote.revisions[0];
    if (!current) throw new ConflictException('Current Quote revision is missing and requires recovery.');
    if (current.discountMinor !== 0 || current.taxEnabled || current.taxMinor !== 0) {
      throw new ConflictException('This Quote already contains a commercial adjustment that requires a dedicated revision workflow.');
    }

    const submission = submissionFrom(current.structuredData);
    const supplied = validatedDetails(input, submission.request.addOns.length);
    const mergedReview: AdminQuoteReviewData = {
      ...(submission.adminReview ?? {}),
      addOns: { ...(submission.adminReview?.addOns ?? {}), ...supplied },
    };
    const revisedSubmission: ReviewedSubmission = {
      ...submission,
      adminReview: mergedReview,
    };

    const costResolution = await resolveQuoteOperationalCosts(this.operationalCostProvider, revisedSubmission);
    const pricing = costResolution.kind === 'READY'
      ? calculateAdminReviewedQuotePricing(revisedSubmission, costResolution.costs)
      : calculateAdminReviewedQuotePricing(revisedSubmission);
    const nextStatus = costResolution.kind === 'READY' && pricing.attentionReasons.length === 0
      ? QuoteStatus.SUBMITTED
      : QuoteStatus.NEEDS_ATTENTION;
    const nextRevisionNumber = quote.currentRevisionNumber + 1;

    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.quote.findUnique({ where: { id }, select: { currentRevisionNumber: true, status: true, resolutionRevisionNumber: true } });
      if (!locked) throw new NotFoundException('Quote not found.');
      if (locked.currentRevisionNumber !== input.expectedRevisionNumber) throw new ConflictException(`Quote changed. Current revision is ${locked.currentRevisionNumber}.`);
      if (locked.status !== QuoteStatus.NEEDS_ATTENTION && locked.status !== QuoteStatus.SUBMITTED) throw new ConflictException(`${locked.status} Quote cannot be revised.`);

      await tx.quoteRevision.create({
        data: {
          quoteId: id,
          revisionNumber: nextRevisionNumber,
          origin: QuoteRevisionOrigin.ADMIN_REVISION,
          structuredData: revisedSubmission as unknown as Prisma.InputJsonValue,
          currency: pricing.pricing.currency,
          subtotalMinor: pricing.pricing.subtotalMinor,
          discountMinor: 0,
          taxEnabled: false,
          taxMinor: 0,
          totalMinor: pricing.pricing.totalMinor,
          lineItems: {
            create: [
              ...pricing.pricing.lines.map((item, index) => ({
                type: lineItemType(item.code),
                code: item.code,
                label: item.label,
                quantity: item.quantity,
                unitAmountMinor: item.unitAmountMinor,
                lineTotalMinor: item.lineAmountMinor,
                sortOrder: index,
              })),
              ...(pricing.pricing.adjustmentsMinor > 0 ? [{
                type: QuoteLineItemType.ADJUSTMENT,
                code: 'PROFITABILITY_FLOOR_ADJUSTMENT',
                label: 'Profitability safeguard adjustment',
                quantity: 1,
                unitAmountMinor: pricing.pricing.adjustmentsMinor,
                lineTotalMinor: pricing.pricing.adjustmentsMinor,
                sortOrder: pricing.pricing.lines.length,
              }] : []),
            ],
          },
        },
      });

      await tx.quote.update({
        where: { id },
        data: {
          currentRevisionNumber: nextRevisionNumber,
          status: nextStatus,
          ...(locked.resolutionRevisionNumber === input.expectedRevisionNumber ? { resolutionRevisionNumber: nextRevisionNumber } : {}),
        },
      });

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          actorUserId,
          type: QuoteActivityType.REVISION_CREATED,
          previousStatus: locked.status,
          newStatus: nextStatus,
          note: 'Admin reviewed missing Quote pricing details and recalculated the authoritative price.',
          metadata: {
            previousRevisionNumber: input.expectedRevisionNumber,
            revisionNumber: nextRevisionNumber,
            suppliedAddOnIndexes: Object.keys(supplied),
            operationalCostProvenance: costResolution.provenance,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          actorUserId,
          type: nextStatus === QuoteStatus.NEEDS_ATTENTION ? QuoteActivityType.NEEDS_ATTENTION_SET : QuoteActivityType.NEEDS_ATTENTION_CLEARED,
          previousStatus: locked.status,
          newStatus: nextStatus,
          metadata: {
            reasons: pricing.attentionReasons,
            ...(costResolution.kind === 'NEEDS_ATTENTION' ? {
              operationalCosts: {
                missing: costResolution.missing,
                invalid: costResolution.invalid,
                provenance: costResolution.provenance,
              },
            } : {}),
          } as Prisma.InputJsonValue,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return {
      quoteId: id,
      revisionNumber: nextRevisionNumber,
      status: nextStatus,
      pricing: pricing.pricing,
      attentionReasons: pricing.attentionReasons,
    };
  }
}
