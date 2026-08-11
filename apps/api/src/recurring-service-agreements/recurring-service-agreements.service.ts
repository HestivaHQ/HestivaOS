import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PreferredTimeWindow, RecurrenceWeekday, RecurringServiceAgreementStatus, ServiceStatus, ServiceType, WorkOrderActivityType, WorkOrderFrequency, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { dateOnly, johannesburgDate, nextOccurrence } from './recurrence';

export type AgreementInput = {
  propertyId: string; serviceId: string; addOnIds?: string[]; frequency: WorkOrderFrequency;
  effectiveDate: string; endDate?: string | null; weekday?: RecurrenceWeekday | null; dayOfMonth?: number | null;
  preferredTimeWindow?: PreferredTimeWindow | null; customFrequencyNote?: string | null; recurringInstructions?: string | null;
};
const include = { property: { include: { customer: true } }, service: true, addOns: { include: { service: true } }, _count: { select: { workOrders: true } } } as const;

@Injectable()
export class RecurringServiceAgreementsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.recurringServiceAgreement.findMany({ include, orderBy: [{ nextServiceDate: 'asc' }, { createdAt: 'desc' }] }); }
  async findOne(id: string) { const value = await this.prisma.recurringServiceAgreement.findUnique({ where: { id }, include }); if (!value) throw new NotFoundException('Recurring service not found.'); return value; }
  async create(input: AgreementInput) {
    const normalized = await this.validate(input);
    return this.prisma.recurringServiceAgreement.create({ data: { ...normalized, addOns: input.addOnIds?.length ? { create: input.addOnIds.map((serviceId) => ({ serviceId })) } : undefined }, include });
  }
  async update(id: string, input: Partial<AgreementInput>) {
    const existing = await this.findOne(id);
    if (input.propertyId && input.propertyId !== existing.propertyId && existing._count.workOrders > 0) throw new BadRequestException('Property cannot change after a work order has been generated.');
    const merged: AgreementInput = { propertyId: input.propertyId ?? existing.propertyId, serviceId: input.serviceId ?? existing.serviceId, frequency: input.frequency ?? existing.frequency, effectiveDate: input.effectiveDate ?? existing.effectiveDate.toISOString().slice(0, 10), endDate: input.endDate === undefined ? existing.endDate?.toISOString().slice(0, 10) : input.endDate, weekday: input.weekday === undefined ? existing.weekday : input.weekday, dayOfMonth: input.dayOfMonth === undefined ? existing.dayOfMonth : input.dayOfMonth, preferredTimeWindow: input.preferredTimeWindow === undefined ? existing.preferredTimeWindow : input.preferredTimeWindow, customFrequencyNote: input.customFrequencyNote === undefined ? existing.customFrequencyNote : input.customFrequencyNote, recurringInstructions: input.recurringInstructions === undefined ? existing.recurringInstructions : input.recurringInstructions, addOnIds: input.addOnIds ?? existing.addOns.map((a) => a.serviceId) };
    const normalized = await this.validate(merged, existing.serviceId, existing.addOns.map((a) => a.serviceId));
    return this.prisma.recurringServiceAgreement.update({ where: { id }, data: { ...normalized, ...(input.addOnIds ? { addOns: { deleteMany: {}, create: input.addOnIds.map((serviceId) => ({ serviceId })) } } : {}) }, include });
  }
  async changeStatus(id: string, status: RecurringServiceAgreementStatus) {
    const agreement = await this.findOne(id);
    if (!Object.values(RecurringServiceAgreementStatus).includes(status)) throw new BadRequestException('Invalid recurring service status.');
    if (agreement.status === RecurringServiceAgreementStatus.CANCELLED && status !== agreement.status) throw new BadRequestException('A cancelled recurring service cannot be resumed.');
    const nextServiceDate = status === RecurringServiceAgreementStatus.ACTIVE ? nextOccurrence(agreement, johannesburgDate()) : agreement.nextServiceDate;
    return this.prisma.recurringServiceAgreement.update({ where: { id }, data: { status, nextServiceDate }, include });
  }
  async generateNext(id: string, createdById: string, now = new Date()) {
    const today = johannesburgDate(now);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const agreement = await tx.recurringServiceAgreement.findUnique({ where: { id }, include: { property: true, service: true, addOns: true, workOrders: { where: { recurrenceDate: { gte: today } }, take: 1 } } });
        if (!agreement) throw new NotFoundException('Recurring service not found.');
        if (agreement.status !== RecurringServiceAgreementStatus.ACTIVE || agreement.frequency === WorkOrderFrequency.CUSTOM) return null;
        if (agreement.endDate && agreement.endDate < today) { await tx.recurringServiceAgreement.update({ where: { id }, data: { status: RecurringServiceAgreementStatus.ENDED, nextServiceDate: null } }); return null; }
        if (agreement.workOrders.length) return agreement.workOrders[0];
        const occurrence = nextOccurrence(agreement, today);
        if (!occurrence) return null;
        const businessDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replaceAll('-', '');
        const counter = await tx.workOrderDailyCounter.upsert({ where: { businessDate }, create: { businessDate, sequence: 1 }, update: { sequence: { increment: 1 } } });
        const reference = `WO-${businessDate}-${String(counter.sequence).padStart(4, '0')}`;
        const workOrder = await tx.workOrder.create({ data: { customerId: agreement.property.customerId, propertyId: agreement.propertyId, createdById, serviceId: agreement.serviceId, recurringAgreementId: agreement.id, recurrenceDate: occurrence, reference, title: reference, description: agreement.recurringInstructions, frequency: agreement.frequency, status: WorkOrderStatus.NEW, addOns: agreement.addOns.length ? { create: agreement.addOns.map((a) => ({ serviceId: a.serviceId })) } : undefined } });
        await tx.workOrderActivity.create({ data: { workOrderId: workOrder.id, type: WorkOrderActivityType.WORK_ORDER_CREATED, newStatus: WorkOrderStatus.NEW, actorId: createdById } });
        await tx.recurringServiceAgreement.update({ where: { id }, data: { nextServiceDate: occurrence } });
        return workOrder;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return this.prisma.workOrder.findUnique({ where: { recurringAgreementId_recurrenceDate: { recurringAgreementId: id, recurrenceDate: nextOccurrence(await this.findOne(id), today)! } } });
      throw error;
    }
  }
  private async validate(input: AgreementInput, existingServiceId?: string, existingAddOnIds: string[] = []) {
    if (input.frequency === WorkOrderFrequency.ONE_TIME) throw new BadRequestException('ONE_TIME does not create a recurring service.');
    if (!Object.values(WorkOrderFrequency).includes(input.frequency)) throw new BadRequestException('Invalid recurring frequency.');
    if ((input.frequency === WorkOrderFrequency.WEEKLY || input.frequency === WorkOrderFrequency.EVERY_TWO_WEEKS) && !input.weekday) throw new BadRequestException('A weekday is required for weekly recurrence.');
    if (input.frequency === WorkOrderFrequency.MONTHLY && (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth! < 1 || input.dayOfMonth! > 31)) throw new BadRequestException('Monthly recurrence requires a day from 1 to 31.');
    if (input.frequency === WorkOrderFrequency.CUSTOM && !input.customFrequencyNote?.trim()) throw new BadRequestException('CUSTOM frequency requires a note and is manually scheduled.');
    if (input.addOnIds && new Set(input.addOnIds).size !== input.addOnIds.length) throw new BadRequestException('Duplicate add-ons are not allowed.');
    let effectiveDate: Date; let endDate: Date | null;
    try { effectiveDate = dateOnly(input.effectiveDate); endDate = input.endDate ? dateOnly(input.endDate) : null; } catch { throw new BadRequestException('Dates must be valid YYYY-MM-DD calendar dates.'); }
    if (endDate && endDate < effectiveDate) throw new BadRequestException('End date cannot be before effective date.');
    const [property, service, addOns] = await Promise.all([this.prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true } }), this.prisma.service.findUnique({ where: { id: input.serviceId } }), this.prisma.service.findMany({ where: { id: { in: input.addOnIds ?? [] } } })]);
    if (!property) throw new NotFoundException('Property not found.'); if (!service) throw new NotFoundException('Service not found.');
    if (service.type !== ServiceType.PRIMARY && service.type !== ServiceType.BOTH) throw new BadRequestException('Primary service must be selectable in primary context.');
    if (service.status !== ServiceStatus.ACTIVE && service.id !== existingServiceId) throw new BadRequestException('Select an active primary service.');
    if (addOns.length !== (input.addOnIds?.length ?? 0)) throw new NotFoundException('One or more add-ons were not found.');
    if (addOns.some((s) => s.type !== ServiceType.ADD_ON && s.type !== ServiceType.BOTH)) throw new BadRequestException('Add-ons must be selectable in add-on context.');
    if (addOns.some((s) => s.status !== ServiceStatus.ACTIVE && !existingAddOnIds.includes(s.id))) throw new BadRequestException('Only active add-ons can be assigned.');
    const rule = { frequency: input.frequency, effectiveDate, endDate, weekday: input.weekday, dayOfMonth: input.dayOfMonth };
    return { propertyId: input.propertyId, serviceId: input.serviceId, frequency: input.frequency, effectiveDate, endDate, weekday: input.frequency === WorkOrderFrequency.WEEKLY || input.frequency === WorkOrderFrequency.EVERY_TWO_WEEKS ? input.weekday : null, dayOfMonth: input.frequency === WorkOrderFrequency.MONTHLY ? input.dayOfMonth : null, preferredTimeWindow: input.preferredTimeWindow ?? null, customFrequencyNote: input.frequency === WorkOrderFrequency.CUSTOM ? input.customFrequencyNote!.trim() : null, recurringInstructions: input.recurringInstructions?.trim() || null, nextServiceDate: nextOccurrence(rule, johannesburgDate()) };
  }
}
