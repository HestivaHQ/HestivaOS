import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuoteActivityType, QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type DeclineQuoteInput = { expectedRevisionNumber: number; reason?: string };

export type QuoteReadinessBlocker = {
  code: string;
  message: string;
  resolvableInCurrentSlice: boolean;
};

const declineEligibleStatuses: QuoteStatus[] = [QuoteStatus.SUBMITTED, QuoteStatus.NEEDS_ATTENTION];
const detailInclude = {
  acceptedRevision: { include: { lineItems: { orderBy: { sortOrder: 'asc' as const } } } },
  photos: { orderBy: { createdAt: 'asc' as const } },
  activities: { orderBy: { createdAt: 'asc' as const } },
} as const;

function normalizedReason(reason?: string): string | null {
  const value = reason?.trim();
  if (value && value.length > 500) throw new BadRequestException('Decline reason must be 500 characters or fewer.');
  return value || null;
}

@Injectable()
export class QuoteReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 20, search?: string, status?: QuoteStatus) {
    if (status !== undefined && !Object.values(QuoteStatus).includes(status)) throw new BadRequestException('A valid Quote status is required.');
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.QuoteWhereInput = {
      status,
      ...(term ? { OR: [{ reference: { contains: term, mode: 'insensitive' } }, { submissionKey: { contains: term, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        select: {
          id: true, reference: true, submissionKey: true, status: true, currentRevisionNumber: true,
          validUntil: true, acceptedAt: true, acceptedByUserId: true, acceptedRevisionId: true,
          declinedAt: true, declinedByUserId: true, customerId: true, propertyId: true,
          workOrderId: true, recurringAgreementId: true, createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.quote.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: detailInclude });
    if (!quote) throw new NotFoundException('Quote not found.');
    const currentRevision = await this.prisma.quoteRevision.findUnique({
      where: { quoteId_revisionNumber: { quoteId: id, revisionNumber: quote.currentRevisionNumber } },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!currentRevision) throw new ConflictException('Quote current revision is missing and requires recovery.');
    return { ...quote, currentRevision };
  }

  async preflight(id: string, expectedRevisionNumber: number, now = new Date()) {
    this.validateExpectedRevision(expectedRevisionNumber);
    const quote = await this.findOne(id);
    const blockers: QuoteReadinessBlocker[] = [];
    if (quote.currentRevisionNumber !== expectedRevisionNumber) blockers.push({ code: 'STALE_REVISION', message: `Expected revision ${expectedRevisionNumber}, but current revision is ${quote.currentRevisionNumber}.`, resolvableInCurrentSlice: true });
    if (quote.status === QuoteStatus.NEEDS_ATTENTION) blockers.push({ code: 'NEEDS_ATTENTION', message: 'Quote review reasons must be resolved before acceptance.', resolvableInCurrentSlice: false });
    if (quote.status === QuoteStatus.DECLINED) blockers.push({ code: 'DECLINED', message: 'Declined Quotes are terminal.', resolvableInCurrentSlice: false });
    if (quote.status === QuoteStatus.ACCEPTED) blockers.push({ code: 'ALREADY_ACCEPTED', message: 'Quote is already accepted.', resolvableInCurrentSlice: false });
    if (quote.status === QuoteStatus.EXPIRED || quote.validUntil.getTime() < now.getTime()) blockers.push({ code: 'EXPIRED', message: 'Expired Quotes cannot be accepted.', resolvableInCurrentSlice: false });
    if (!quote.customerId) blockers.push({ code: 'CUSTOMER_UNRESOLVED', message: 'Customer match-or-review is not complete.', resolvableInCurrentSlice: false });
    if (!quote.propertyId) blockers.push({ code: 'PROPERTY_UNRESOLVED', message: 'Property match-or-review is not complete.', resolvableInCurrentSlice: false });
    if (quote.photos.some((photo) => photo.status !== 'STORED')) blockers.push({ code: 'QUOTE_EVIDENCE_UNRESOLVED', message: 'One or more persisted Quote photos are not stored.', resolvableInCurrentSlice: false });
    blockers.push({ code: 'OPERATIONAL_CONVERSION_NOT_IMPLEMENTED', message: 'Atomic accepted-Quote operational conversion is not implemented.', resolvableInCurrentSlice: false });
    return { quoteId: quote.id, quoteReference: quote.reference, currentRevisionNumber: quote.currentRevisionNumber, expectedRevisionNumber, eligibleForAcceptance: false, blockers };
  }

  async decline(id: string, input: DeclineQuoteInput, actorUserId: string) {
    this.validateExpectedRevision(input.expectedRevisionNumber);
    if (!actorUserId) throw new BadRequestException('Declining user is required.');
    const reason = normalizedReason(input.reason);
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id }, include: { activities: { where: { type: QuoteActivityType.STATUS_CHANGED, newStatus: QuoteStatus.DECLINED }, orderBy: { createdAt: 'desc' }, take: 1 } } });
      if (!quote) throw new NotFoundException('Quote not found.');
      if (quote.currentRevisionNumber !== input.expectedRevisionNumber) throw new ConflictException(`Quote revision is stale. Current revision is ${quote.currentRevisionNumber}.`);
      if (quote.status === QuoteStatus.DECLINED) {
        const decision = quote.activities[0];
        const metadata = decision?.metadata as { expectedRevisionNumber?: number } | null;
        if (quote.declinedByUserId === actorUserId && decision?.note === reason && metadata?.expectedRevisionNumber === input.expectedRevisionNumber) return quote;
        throw new ConflictException('Quote is already declined with a different decision.');
      }
      if (!declineEligibleStatuses.includes(quote.status)) throw new ConflictException(`${quote.status} Quote cannot be declined.`);
      if (quote.acceptedAt || quote.acceptedRevisionId || quote.workOrderId || quote.recurringAgreementId) throw new ConflictException('Quote has accepted operational state and cannot be declined.');
      const declinedAt = new Date();
      const transition = await tx.quote.updateMany({
        where: { id, status: quote.status, currentRevisionNumber: input.expectedRevisionNumber, declinedAt: null },
        data: { status: QuoteStatus.DECLINED, declinedAt, declinedByUserId: actorUserId },
      });
      if (transition.count !== 1) throw new ConflictException('Quote decision changed concurrently. Review the current Quote before retrying.');
      await tx.quoteActivity.create({ data: { quoteId: id, type: QuoteActivityType.STATUS_CHANGED, previousStatus: quote.status, newStatus: QuoteStatus.DECLINED, actorUserId, note: reason, metadata: { expectedRevisionNumber: input.expectedRevisionNumber } } });
      return tx.quote.findUniqueOrThrow({ where: { id }, include: detailInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private validateExpectedRevision(value: number) {
    if (!Number.isInteger(value) || value < 1) throw new BadRequestException('expectedRevisionNumber must be a positive integer.');
  }
}
