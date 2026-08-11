import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CrewStatus, HomeCondition, Prisma, ServiceStatus, ServiceType, WorkOrderActivityType, WorkOrderFrequency, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateWorkOrderInput = {
  customerId: string;
  propertyId: string;
  createdById: string;
  technicianId?: string | null;
  crewId?: string | null;
  serviceId: string;
  addOnIds?: string[];
  frequency?: WorkOrderFrequency | null;
  customFrequencyNote?: string | null;
  homeCondition?: HomeCondition | null;
  description?: string;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  scheduledAt?: string;
  completedAt?: string;
};

export type UpdateWorkOrderInput = Partial<Omit<CreateWorkOrderInput, 'createdById' | 'serviceId'>> & { serviceId?: string };
export type ChangeWorkOrderStatusInput = { status: WorkOrderStatus; note?: string; actorId?: string };
export type WorkOrderAlert = 'overdue' | 'awaiting-assignment' | 'waiting-for-parts' | 'high-priority' | 'today-unassigned';

const workOrderInclude = {
  customer: true,
  property: true,
  createdBy: true,
  technician: true,
  crew: { include: { leader: true, members: { include: { technician: true } } } },
  service: true,
  recurringAgreement: true,
  addOns: { include: { service: true }, orderBy: { createdAt: 'asc' as const } },
} as const;

export function johannesburgBusinessDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replaceAll('-', '');
}
const validTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  NEW: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.CANCELLED],
  ASSIGNED: [WorkOrderStatus.ACCEPTED, WorkOrderStatus.NEW, WorkOrderStatus.CANCELLED],
  ACCEPTED: [WorkOrderStatus.TRAVELLING, WorkOrderStatus.ON_SITE, WorkOrderStatus.ASSIGNED, WorkOrderStatus.CANCELLED],
  TRAVELLING: [WorkOrderStatus.ON_SITE, WorkOrderStatus.ACCEPTED, WorkOrderStatus.CANCELLED],
  ON_SITE: [WorkOrderStatus.WAITING_FOR_PARTS, WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
  WAITING_FOR_PARTS: [WorkOrderStatus.ON_SITE, WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
  COMPLETED: [WorkOrderStatus.CLOSED, WorkOrderStatus.ON_SITE],
  CLOSED: [],
  CANCELLED: [],
};
const nonActionableStatuses: WorkOrderStatus[] = [WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED, WorkOrderStatus.CANCELLED];
const actionableStatuses = Object.values(WorkOrderStatus).filter((status) => !nonActionableStatuses.includes(status));

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWorkOrderInput) {
    this.validateQuoteFields(input);
    if (!input.customerId || !input.propertyId || !input.createdById || !input.serviceId) {
      throw new BadRequestException('customerId, propertyId, serviceId and createdById are required.');
    }

    const [customer, property, user, service, technician, crew] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }),
      this.prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, customerId: true } }),
      this.prisma.user.findUnique({ where: { id: input.createdById }, select: { id: true } }),
      this.prisma.service.findUnique({ where: { id: input.serviceId }, select: { id: true, status: true, type: true } }),
      input.technicianId ? this.prisma.technician.findUnique({ where: { id: input.technicianId }, select: { id: true, status: true, firstName: true, lastName: true } }) : Promise.resolve(null),
      input.crewId ? this.prisma.crew.findUnique({ where: { id: input.crewId }, select: { id: true, name: true, status: true, members: { select: { technicianId: true } } } }) : Promise.resolve(null),
    ]);

    if (!customer) throw new NotFoundException('Customer not found.');
    if (!property) throw new NotFoundException('Property not found.');
    if (!user) throw new NotFoundException('Creating user not found.');
    if (!service) throw new NotFoundException('Service not found.');
    if (service.type !== ServiceType.PRIMARY && service.type !== ServiceType.BOTH) throw new BadRequestException('Primary service must be selectable as a primary service.');
    if (service.status !== ServiceStatus.ACTIVE) throw new BadRequestException('Select an active primary service for a new work order.');
    await this.validateAddOns(input.addOnIds ?? []);
    if (property.customerId !== input.customerId) throw new BadRequestException('Property does not belong to the selected customer.');
    if (input.technicianId && !technician) throw new NotFoundException('Technician not found.');
    if (technician?.status === 'INACTIVE') throw new BadRequestException('Inactive technicians cannot be assigned to new work orders.');
    if (input.crewId && !crew) throw new NotFoundException('Crew not found.');
    if (crew?.status === CrewStatus.INACTIVE) throw new BadRequestException('Inactive crews cannot be assigned to new work orders.');
    if (input.crewId && input.technicianId && !crew?.members.some((member) => member.technicianId === input.technicianId)) {
      throw new BadRequestException('The designated technician must belong to the assigned crew.');
    }

    const assigned = Boolean(input.technicianId || input.crewId);
    const initialStatus = assigned ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.NEW;
    if (input.status && input.status !== initialStatus && !(input.status === WorkOrderStatus.NEW && assigned)) {
      throw new BadRequestException(`New work orders must start as ${initialStatus}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const businessDate = johannesburgBusinessDate();
      const counter = await tx.workOrderDailyCounter.upsert({
        where: { businessDate }, create: { businessDate, sequence: 1 }, update: { sequence: { increment: 1 } },
      });
      if (counter.sequence > 9999) throw new BadRequestException('The daily work order reference limit has been reached.');
      const reference = `WO-${businessDate}-${String(counter.sequence).padStart(4, '0')}`;
      const workOrder = await tx.workOrder.create({
        data: {
          customerId: input.customerId,
          propertyId: input.propertyId,
          createdById: input.createdById,
          technicianId: input.technicianId || null,
          crewId: input.crewId || null,
          serviceId: input.serviceId,
          frequency: input.frequency ?? null,
          customFrequencyNote: input.frequency === WorkOrderFrequency.CUSTOM ? input.customFrequencyNote?.trim() || null : null,
          homeCondition: input.homeCondition ?? null,
          addOns: input.addOnIds?.length ? { create: input.addOnIds.map((serviceId) => ({ serviceId })) } : undefined,
          reference,
          title: reference,
          description: input.description?.trim() || null,
          status: initialStatus,
          priority: input.priority,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          completedAt: input.completedAt ? new Date(input.completedAt) : null,
        },
        include: workOrderInclude,
      });
      const activities: Prisma.WorkOrderActivityCreateManyInput[] = [
        { workOrderId: workOrder.id, type: WorkOrderActivityType.WORK_ORDER_CREATED, newStatus: WorkOrderStatus.NEW, actorId: input.createdById },
      ];
      if (input.technicianId) activities.push({ workOrderId: workOrder.id, type: WorkOrderActivityType.TECHNICIAN_ASSIGNED, note: `Technician: ${technician?.firstName} ${technician?.lastName}`, actorId: input.createdById });
      if (input.crewId) activities.push({ workOrderId: workOrder.id, type: WorkOrderActivityType.CREW_ASSIGNED, note: `Crew: ${crew?.name}`, actorId: input.createdById });
      if (assigned) activities.push({ workOrderId: workOrder.id, type: WorkOrderActivityType.STATUS_CHANGED, previousStatus: WorkOrderStatus.NEW, newStatus: WorkOrderStatus.ASSIGNED, actorId: input.createdById });
      await tx.workOrderActivity.createMany({ data: activities });
      return workOrder;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: WorkOrderStatus, priority?: WorkOrderPriority, customerId?: string, propertyId?: string, technicianId?: string, crewId?: string, alert?: WorkOrderAlert) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const alertWhere: Record<WorkOrderAlert, Prisma.WorkOrderWhereInput> = {
      overdue: { status: { in: actionableStatuses }, scheduledAt: { lt: todayStart } },
      'awaiting-assignment': { status: WorkOrderStatus.NEW, technicianId: null, crewId: null },
      'waiting-for-parts': { status: WorkOrderStatus.WAITING_FOR_PARTS },
      'high-priority': { status: { in: actionableStatuses }, priority: { in: [WorkOrderPriority.HIGH, WorkOrderPriority.URGENT] } },
      'today-unassigned': { status: { in: actionableStatuses }, technicianId: null, crewId: null, scheduledAt: { gte: todayStart, lt: tomorrowStart } },
    };
    const where: Prisma.WorkOrderWhereInput = { status, priority, customerId, propertyId, technicianId, crewId, ...(alert ? alertWhere[alert] : {}), ...(term ? { OR: [{ reference: { contains: term, mode: 'insensitive' } }, { title: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }, { customer: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { contactName: { contains: term, mode: 'insensitive' } }] } }, { property: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { addressLine1: { contains: term, mode: 'insensitive' } }] } }, { service: { name: { contains: term, mode: 'insensitive' } } }, { crew: { name: { contains: term, mode: 'insensitive' } } }] } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({ where, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], skip: (safePage - 1) * safePageSize, take: safePageSize, include: workOrderInclude }),
      this.prisma.workOrder.count({ where }),
    ]);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id }, include: workOrderInclude });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    return workOrder;
  }

  async findTimeline(id: string) {
    await this.findOne(id);
    return this.prisma.workOrderActivity.findMany({ where: { workOrderId: id }, include: { actor: true }, orderBy: { createdAt: 'asc' } });
  }

  async changeStatus(id: string, input: ChangeWorkOrderStatusInput) {
    return this.update(id, { status: input.status }, input.note, input.actorId);
  }

  async update(id: string, input: UpdateWorkOrderInput, note?: string, actorId?: string) {
    this.validateQuoteFields(input);
    const existing = await this.findOne(id);
    const customerId = input.customerId ?? existing.customerId;
    const propertyId = input.propertyId ?? existing.propertyId;
    if (input.customerId !== undefined || input.propertyId !== undefined) {
      const property = await this.prisma.property.findUnique({ where: { id: propertyId }, select: { customerId: true } });
      if (!property) throw new NotFoundException('Property not found.');
      if (property.customerId !== customerId) throw new BadRequestException('Property does not belong to the selected customer.');
    }

    let technician: { status: string; firstName: string; lastName: string } | null = null;
    if (input.technicianId) {
      technician = await this.prisma.technician.findUnique({ where: { id: input.technicianId }, select: { status: true, firstName: true, lastName: true } });
      if (!technician) throw new NotFoundException('Technician not found.');
      if (technician.status === 'INACTIVE' && input.technicianId !== existing.technicianId) throw new BadRequestException('Inactive technicians cannot be assigned to work orders.');
    }
    let crew: { status: CrewStatus; name: string; members: { technicianId: string }[] } | null = null;
    if (input.crewId) {
      crew = await this.prisma.crew.findUnique({ where: { id: input.crewId }, select: { status: true, name: true, members: { select: { technicianId: true } } } });
      if (!crew) throw new NotFoundException('Crew not found.');
      if (crew.status === CrewStatus.INACTIVE && input.crewId !== existing.crewId) throw new BadRequestException('Inactive crews cannot be assigned to work orders.');
    }
    const nextCrewId = input.crewId !== undefined ? input.crewId : existing.crewId;
    const nextTechnicianId = input.technicianId !== undefined ? input.technicianId : existing.technicianId;
    if (nextCrewId && nextTechnicianId) {
      const membership = crew && input.crewId === nextCrewId
        ? crew.members.some((member) => member.technicianId === nextTechnicianId)
        : Boolean(await this.prisma.crewMember.findUnique({ where: { crewId_technicianId: { crewId: nextCrewId, technicianId: nextTechnicianId } } }));
      if (!membership) throw new BadRequestException('The designated technician must belong to the assigned crew.');
    }

    const technicianChanged = input.technicianId !== undefined && input.technicianId !== existing.technicianId;
    const crewChanged = input.crewId !== undefined && input.crewId !== existing.crewId;
    const assignmentAdded = (technicianChanged && Boolean(input.technicianId)) || (crewChanged && Boolean(input.crewId));
    const nextStatus = assignmentAdded && existing.status === WorkOrderStatus.NEW ? WorkOrderStatus.ASSIGNED : input.status ?? existing.status;
    this.assertTransition(existing.status, nextStatus);

    if (input.serviceId && input.serviceId !== existing.serviceId) {
      const service = await this.prisma.service.findUnique({ where: { id: input.serviceId }, select: { status: true, type: true } });
      if (!service) throw new NotFoundException('Service not found.');
      if (service.type !== ServiceType.PRIMARY && service.type !== ServiceType.BOTH) throw new BadRequestException('Primary service must be selectable as a primary service.');
      if (service.status !== ServiceStatus.ACTIVE) throw new BadRequestException('Select an active primary service.');
    }

    if (input.addOnIds !== undefined) {
      const existingIds = existing.addOns.map((item) => item.serviceId);
      await this.validateAddOns(input.addOnIds.filter((id) => !existingIds.includes(id)));
    }

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.update({
        where: { id },
        data: {
          ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
          ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
          ...(input.technicianId !== undefined ? { technicianId: input.technicianId || null } : {}),
          ...(input.crewId !== undefined ? { crewId: input.crewId || null } : {}),
          ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
          ...(input.frequency !== undefined ? { frequency: input.frequency, customFrequencyNote: input.frequency === WorkOrderFrequency.CUSTOM ? input.customFrequencyNote?.trim() || null : null } : {}),
          ...(input.homeCondition !== undefined ? { homeCondition: input.homeCondition } : {}),
          ...(input.addOnIds !== undefined ? { addOns: { deleteMany: {}, create: input.addOnIds.map((serviceId) => ({ serviceId })) } } : {}),
          ...(nextStatus !== existing.status ? { status: nextStatus } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
          ...(input.completedAt !== undefined ? { completedAt: input.completedAt ? new Date(input.completedAt) : null } : {}),
        },
        include: workOrderInclude,
      });
      const activities: Prisma.WorkOrderActivityCreateManyInput[] = [];
      if (technicianChanged) activities.push({
        workOrderId: id,
        type: input.technicianId ? (existing.technicianId ? WorkOrderActivityType.TECHNICIAN_CHANGED : WorkOrderActivityType.TECHNICIAN_ASSIGNED) : WorkOrderActivityType.TECHNICIAN_REMOVED,
        note: input.technicianId ? `Technician: ${technician?.firstName} ${technician?.lastName}` : `Technician removed: ${existing.technician?.firstName} ${existing.technician?.lastName}`,
        actorId,
      });
      if (crewChanged) activities.push({
        workOrderId: id,
        type: input.crewId ? (existing.crewId ? WorkOrderActivityType.CREW_CHANGED : WorkOrderActivityType.CREW_ASSIGNED) : WorkOrderActivityType.CREW_REMOVED,
        note: input.crewId ? `Crew: ${crew?.name}` : `Crew removed: ${existing.crew?.name}`,
        actorId,
      });
      if (nextStatus !== existing.status) {
        activities.push({ workOrderId: id, type: WorkOrderActivityType.STATUS_CHANGED, previousStatus: existing.status, newStatus: nextStatus, note: note?.trim() || null, actorId });
        if (nextStatus === WorkOrderStatus.CLOSED) activities.push({ workOrderId: id, type: WorkOrderActivityType.WORK_ORDER_CLOSED, actorId });
        if (nextStatus === WorkOrderStatus.CANCELLED) activities.push({ workOrderId: id, type: WorkOrderActivityType.WORK_ORDER_CANCELLED, actorId });
      }
      if (activities.length) await tx.workOrderActivity.createMany({ data: activities });
      return workOrder;
    });
  }

  async remove(id: string) { await this.findOne(id); return this.prisma.workOrder.delete({ where: { id } }); }


  private validateQuoteFields(input: Pick<UpdateWorkOrderInput, 'frequency' | 'customFrequencyNote' | 'homeCondition' | 'addOnIds'>) {
    if (input.frequency !== undefined && input.frequency !== null && !Object.values(WorkOrderFrequency).includes(input.frequency)) throw new BadRequestException('A valid work order frequency is required.');
    if (input.homeCondition !== undefined && input.homeCondition !== null && !Object.values(HomeCondition).includes(input.homeCondition)) throw new BadRequestException('A valid home condition is required.');
    if (input.customFrequencyNote?.trim() && input.frequency !== WorkOrderFrequency.CUSTOM) throw new BadRequestException('customFrequencyNote is only allowed for CUSTOM frequency.');
    if (input.addOnIds && new Set(input.addOnIds).size !== input.addOnIds.length) throw new BadRequestException('Duplicate add-on service IDs are not allowed.');
  }

  private async validateAddOns(ids: string[]) {
    if (!ids.length) return;
    const services = await this.prisma.service.findMany({ where: { id: { in: ids } }, select: { id: true, type: true, status: true } });
    if (services.length !== ids.length) throw new NotFoundException('One or more add-on services were not found.');
    if (services.some((service) => service.type !== ServiceType.ADD_ON && service.type !== ServiceType.BOTH)) throw new BadRequestException('Add-ons must be selectable as add-ons.');
    if (services.some((service) => service.status !== ServiceStatus.ACTIVE)) throw new BadRequestException('Only active add-ons can be newly assigned.');
  }

  private assertTransition(previousStatus: WorkOrderStatus, newStatus: WorkOrderStatus) {
    if (previousStatus !== newStatus && !validTransitions[previousStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid work order status transition: ${previousStatus} to ${newStatus}.`);
    }
  }
}
