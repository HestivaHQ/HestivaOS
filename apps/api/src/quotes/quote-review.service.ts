import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuoteActivityType, QuoteEntityResolution, QuoteStatus, ServiceStatus, ServiceType, WorkOrderActivityType, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { johannesburgBusinessDate } from '../work-orders/work-orders.service';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import { newCustomerData, newPropertyData, projectAcceptedOneTimeSubmission, propertyTypeLabel, type AcceptedSubmission } from './quote-acceptance';
import { resolveCustomerMatch, resolvePropertyMatch, type MatchResult } from './quote-match-resolution';

export type DeclineQuoteInput = { expectedRevisionNumber: number; reason?: string };
export type AcceptQuoteInput = { expectedRevisionNumber: number };
export type RecordQuoteResolutionInput = {
  expectedRevisionNumber: number;
  customer: { decision: QuoteEntityResolution; customerId?: string };
  property: { decision: QuoteEntityResolution; propertyId?: string };
};

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
const acceptedResultInclude = {
  acceptedRevision: { include: { lineItems: { orderBy: { sortOrder: 'asc' as const } } } },
  workOrder: { include: { customer: true, property: true, service: true, addOns: { include: { service: true }, orderBy: { createdAt: 'asc' as const } } } },
  activities: { orderBy: { createdAt: 'asc' as const } },
} as const;

function submissionFrom(value: Prisma.JsonValue): WebsiteQuoteSubmissionV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('customer' in value) || !('property' in value)) {
    throw new ConflictException('Quote revision identity data is missing and requires recovery.');
  }
  return value as unknown as WebsiteQuoteSubmissionV1;
}

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
    const resolution = await this.resolveMatches(quote, submissionFrom(currentRevision.structuredData));
    return { ...quote, currentRevision, resolution };
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
    if (!quote.customerResolution || quote.resolutionRevisionNumber !== expectedRevisionNumber || quote.resolution.customer.readiness !== 'READY') blockers.push({ code: 'CUSTOMER_UNRESOLVED', message: 'Customer match-or-review requires a current Admin decision.', resolvableInCurrentSlice: true });
    if (!quote.propertyResolution || quote.resolutionRevisionNumber !== expectedRevisionNumber || quote.resolution.property.readiness !== 'READY') blockers.push({ code: 'PROPERTY_UNRESOLVED', message: 'Property match-or-review requires a current Admin decision.', resolvableInCurrentSlice: true });
    if (quote.photos.some((photo) => photo.status !== 'STORED')) blockers.push({ code: 'QUOTE_EVIDENCE_UNRESOLVED', message: 'One or more persisted Quote photos are not stored.', resolvableInCurrentSlice: false });
    try { projectAcceptedOneTimeSubmission(submissionFrom(quote.currentRevision.structuredData) as AcceptedSubmission); }
    catch (error) { blockers.push({ code: 'OPERATIONAL_MAPPING_BLOCKED', message: error instanceof Error ? error.message : 'Quote cannot be projected safely.', resolvableInCurrentSlice: false }); }
    return { quoteId: quote.id, quoteReference: quote.reference, currentRevisionNumber: quote.currentRevisionNumber, expectedRevisionNumber, resolution: quote.resolution, resolutionReady: Boolean(quote.customerResolution && quote.propertyResolution && quote.resolutionRevisionNumber === expectedRevisionNumber && quote.resolution.customer.readiness === 'READY' && quote.resolution.property.readiness === 'READY'), eligibleForAcceptance: blockers.length === 0, blockers };
  }

  async accept(id: string, input: AcceptQuoteInput, actorUserId: string) {
    this.validateExpectedRevision(input.expectedRevisionNumber);
    if (!actorUserId) throw new BadRequestException('Accepting user is required.');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const quote = await tx.quote.findUnique({ where: { id }, include: { photos: true } });
          if (!quote) throw new NotFoundException('Quote not found.');
          if (quote.currentRevisionNumber !== input.expectedRevisionNumber) throw new ConflictException(`Quote revision is stale. Current revision is ${quote.currentRevisionNumber}.`);
          if (quote.status === QuoteStatus.ACCEPTED) {
            const expectedRevision = await tx.quoteRevision.findUnique({ where: { quoteId_revisionNumber: { quoteId: id, revisionNumber: input.expectedRevisionNumber } }, select: { id: true } });
            if (expectedRevision?.id === quote.acceptedRevisionId && quote.customerId && quote.propertyId && quote.workOrderId && !quote.recurringAgreementId) return tx.quote.findUniqueOrThrow({ where: { id }, include: acceptedResultInclude });
            throw new ConflictException('Quote has incompatible accepted state and requires recovery.');
          }
          if (quote.status !== QuoteStatus.SUBMITTED) throw new ConflictException(`${quote.status} Quote cannot be accepted.`);
          if (quote.validUntil.getTime() < Date.now()) throw new ConflictException('Expired Quote cannot be accepted.');
          if (quote.photos.some((photo) => photo.status !== 'STORED')) throw new ConflictException('Quote evidence must be stored before acceptance.');
          if (!quote.customerResolution || !quote.propertyResolution || quote.resolutionRevisionNumber !== input.expectedRevisionNumber) throw new ConflictException('A current Customer and Property resolution is required.');
          const revision = await tx.quoteRevision.findUnique({ where: { quoteId_revisionNumber: { quoteId: id, revisionNumber: input.expectedRevisionNumber } }, include: { lineItems: true } });
          if (!revision) throw new ConflictException('Quote current revision is missing and requires recovery.');
          const submission = submissionFrom(revision.structuredData) as AcceptedSubmission;
          const projection = projectAcceptedOneTimeSubmission(submission);
          const actor = await tx.user.findUnique({ where: { id: actorUserId }, select: { id: true } });
          if (!actor) throw new BadRequestException('Accepting user does not exist.');

          let customerId = quote.customerId;
          if (quote.customerResolution === QuoteEntityResolution.USE_EXISTING) {
            if (!customerId || !(await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } }))) throw new ConflictException('Selected Customer no longer exists.');
          } else {
            const customer = await tx.customer.create({ data: newCustomerData(submission, actorUserId) });
            customerId = customer.id;
          }

          let propertyId = quote.propertyId;
          if (quote.propertyResolution === QuoteEntityResolution.USE_EXISTING) {
            const property = propertyId ? await tx.property.findUnique({ where: { id: propertyId }, select: { id: true, customerId: true } }) : null;
            if (!property) throw new ConflictException('Selected Property no longer exists.');
            if (property.customerId !== customerId) throw new ConflictException('Selected Property does not belong to the resolved Customer.');
          } else {
            const label = propertyTypeLabel(submission);
            const option = label ? await tx.businessListOption.findFirst({ where: { type: 'PROPERTY_TYPE', label, isActive: true }, select: { id: true } }) : null;
            if (!option) throw new ConflictException('Quote Property type has no active canonical destination.');
            const property = await tx.property.create({ data: newPropertyData(submission, customerId!, option.id) });
            propertyId = property.id;
          }

          const serviceNames = [projection.primaryServiceName, ...projection.addOns.map((item) => item.serviceName)];
          const services = await tx.service.findMany({ where: { OR: serviceNames.map((name) => ({ normalizedName: name.trim().toLocaleLowerCase('en-ZA') })) }, select: { id: true, name: true, normalizedName: true, status: true, type: true } });
          const serviceFor = (name: string) => services.find((service) => service.normalizedName === name.trim().toLocaleLowerCase('en-ZA'));
          const primary = serviceFor(projection.primaryServiceName);
          if (!primary || primary.status !== ServiceStatus.ACTIVE || (primary.type !== ServiceType.PRIMARY && primary.type !== ServiceType.BOTH)) throw new ConflictException('Canonical primary Service is missing, inactive, or not primary-capable.');
          const addOns = projection.addOns.map((item) => ({ ...item, service: serviceFor(item.serviceName) }));
          if (addOns.some((item) => !item.service || item.service.status !== ServiceStatus.ACTIVE || (item.service.type !== ServiceType.ADD_ON && item.service.type !== ServiceType.BOTH))) throw new ConflictException('A canonical add-on Service is missing, inactive, or not add-on-capable.');

          const businessDate = johannesburgBusinessDate();
          const counter = await tx.workOrderDailyCounter.upsert({ where: { businessDate }, create: { businessDate, sequence: 1 }, update: { sequence: { increment: 1 } } });
          if (counter.sequence > 9999) throw new ConflictException('The daily work order reference limit has been reached.');
          const reference = `WO-${businessDate}-${String(counter.sequence).padStart(4, '0')}`;
          const workOrder = await tx.workOrder.create({ data: {
            customerId: customerId!, propertyId: propertyId!, createdById: actorUserId, serviceId: primary.id,
            reference, title: reference, description: projection.description, frequency: projection.frequency,
            homeCondition: projection.homeCondition, scheduledAt: projection.scheduledAt, status: WorkOrderStatus.NEW,
            addOns: addOns.length ? { create: addOns.map((item) => ({ serviceId: item.service!.id, quantity: item.quantity })) } : undefined,
          } });
          await tx.workOrderActivity.create({ data: { workOrderId: workOrder.id, type: WorkOrderActivityType.WORK_ORDER_CREATED, newStatus: WorkOrderStatus.NEW, actorId: actorUserId } });
          const acceptedAt = new Date();
          const transition = await tx.quote.updateMany({ where: { id, status: QuoteStatus.SUBMITTED, currentRevisionNumber: input.expectedRevisionNumber, workOrderId: null, acceptedRevisionId: null }, data: { status: QuoteStatus.ACCEPTED, acceptedAt, acceptedByUserId: actorUserId, acceptedRevisionId: revision.id, customerId, propertyId, workOrderId: workOrder.id } });
          if (transition.count !== 1) throw new ConflictException('Quote decision changed concurrently. Review the current Quote before retrying.');
          await tx.quoteActivity.create({ data: { quoteId: id, type: QuoteActivityType.STATUS_CHANGED, previousStatus: quote.status, newStatus: QuoteStatus.ACCEPTED, actorUserId, metadata: { expectedRevisionNumber: input.expectedRevisionNumber, acceptedRevisionId: revision.id, customerResolution: quote.customerResolution, customerId, propertyResolution: quote.propertyResolution, propertyId, workOrderId: workOrder.id } } });
          return tx.quote.findUniqueOrThrow({ where: { id }, include: acceptedResultInclude });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
        throw error;
      }
    }
    throw new ConflictException('Quote acceptance conflicted repeatedly. Review the current Quote before retrying.');
  }

  async recordResolution(id: string, input: RecordQuoteResolutionInput, actorUserId: string) {
    this.validateExpectedRevision(input.expectedRevisionNumber);
    if (!actorUserId) throw new BadRequestException('Resolving user is required.');
    this.validateResolutionInput(input);
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id } });
      if (!quote) throw new NotFoundException('Quote not found.');
      if (quote.currentRevisionNumber !== input.expectedRevisionNumber) throw new ConflictException(`Quote revision is stale. Current revision is ${quote.currentRevisionNumber}.`);
      const customerId = input.customer.decision === QuoteEntityResolution.USE_EXISTING ? input.customer.customerId! : null;
      const propertyId = input.property.decision === QuoteEntityResolution.USE_EXISTING ? input.property.propertyId! : null;
      if (quote.resolutionRevisionNumber !== null) {
        if (quote.resolutionRevisionNumber === input.expectedRevisionNumber && quote.customerResolution === input.customer.decision && quote.propertyResolution === input.property.decision && quote.customerId === customerId && quote.propertyId === propertyId) return quote;
        throw new ConflictException('Quote already has a different match resolution. Review the current Quote before replacing it.');
      }
      if (customerId && !(await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } }))) throw new BadRequestException('Selected Customer does not exist.');
      if (propertyId) {
        const property = await tx.property.findUnique({ where: { id: propertyId }, select: { id: true, customerId: true } });
        if (!property) throw new BadRequestException('Selected Property does not exist.');
        if (!customerId || property.customerId !== customerId) throw new BadRequestException('Selected Property must belong to the selected existing Customer.');
      }
      if (input.customer.decision === QuoteEntityResolution.CREATE_NEW && input.property.decision === QuoteEntityResolution.USE_EXISTING) throw new BadRequestException('An existing Property cannot be selected for a new Customer.');
      const update = await tx.quote.updateMany({ where: { id, currentRevisionNumber: input.expectedRevisionNumber, resolutionRevisionNumber: null }, data: { customerResolution: input.customer.decision, propertyResolution: input.property.decision, customerId, propertyId, resolutionRevisionNumber: input.expectedRevisionNumber } });
      if (update.count !== 1) throw new ConflictException('Quote resolution changed concurrently. Review the current Quote before retrying.');
      await tx.quoteActivity.create({ data: { quoteId: id, type: QuoteActivityType.MATCH_RESOLUTION_RECORDED, actorUserId, metadata: { expectedRevisionNumber: input.expectedRevisionNumber, customerDecision: input.customer.decision, customerId, propertyDecision: input.property.decision, propertyId } } });
      return tx.quote.findUniqueOrThrow({ where: { id }, include: detailInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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

  private validateResolutionInput(input: RecordQuoteResolutionInput) {
    for (const [label, value, id] of [['Customer', input.customer.decision, input.customer.customerId], ['Property', input.property.decision, input.property.propertyId]] as const) {
      if (!Object.values(QuoteEntityResolution).includes(value)) throw new BadRequestException(`${label} resolution decision is invalid.`);
      if ((value === QuoteEntityResolution.USE_EXISTING) !== Boolean(id)) throw new BadRequestException(`${label} ID is required only when using an existing record.`);
    }
  }

  private async resolveMatches(quote: { customerId: string | null; propertyId: string | null; customerResolution: QuoteEntityResolution | null; propertyResolution: QuoteEntityResolution | null }, submission: WebsiteQuoteSubmissionV1): Promise<{ customer: MatchResult; property: MatchResult }> {
    const customers = await this.prisma.customer.findMany({ select: { id: true, name: true, contactName: true, email: true, phone: true } });
    let customer = resolveCustomerMatch(submission.customer, customers);
    if (quote.customerId || quote.customerResolution) {
      const selected = quote.customerId ? customers.find((item) => item.id === quote.customerId) : undefined;
      customer = { state: quote.customerResolution === QuoteEntityResolution.CREATE_NEW ? 'NO_MATCH_NEW_CANDIDATE' : 'EXACT_EXISTING_MATCH', readiness: selected || quote.customerResolution === QuoteEntityResolution.CREATE_NEW ? 'READY' : 'BLOCKED', candidates: selected ? [{ id: selected.id, displayName: selected.contactName?.trim() || selected.name, evidence: ['EXISTING_LINK'] }] : [] };
    }
    const resolvedCustomerId = quote.customerId ?? (customer.state === 'EXACT_EXISTING_MATCH' ? customer.candidates[0]?.id : undefined);
    let property: MatchResult;
    let scopedProperties: Array<{ id: string; name: string; addressLine1: string; city: string; postalCode: string | null; country: string }> = [];
    if (quote.customerResolution === QuoteEntityResolution.CREATE_NEW || customer.state === 'NO_MATCH_NEW_CANDIDATE') property = { state: 'NO_MATCH_NEW_CANDIDATE', readiness: 'READY', candidates: [] };
    else if (!resolvedCustomerId) property = { state: 'INVALID_OR_INSUFFICIENT_IDENTITY_DATA', readiness: 'BLOCKED', candidates: [] };
    else {
      scopedProperties = await this.prisma.property.findMany({ where: { customerId: resolvedCustomerId }, select: { id: true, name: true, addressLine1: true, city: true, postalCode: true, country: true } });
      property = resolvePropertyMatch(submission.property, scopedProperties);
    }
    if (quote.propertyId || quote.propertyResolution) {
      const selected = quote.propertyId ? scopedProperties.find((item) => item.id === quote.propertyId) : undefined;
      property = { state: quote.propertyResolution === QuoteEntityResolution.CREATE_NEW ? 'NO_MATCH_NEW_CANDIDATE' : 'EXACT_EXISTING_MATCH', readiness: selected || quote.propertyResolution === QuoteEntityResolution.CREATE_NEW ? 'READY' : 'BLOCKED', candidates: selected ? [{ id: selected.id, displayName: `${selected.name} — ${selected.addressLine1}, ${selected.city}`, evidence: ['EXISTING_LINK'] }] : [] };
    }
    return { customer, property };
  }
}
