import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CrewStatus, HomeCondition, Prisma, ServiceStatus, ServiceType, WorkOrderActivityType, WorkOrderFrequency, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type AddOnSelectionInput = {
  serviceId: string;
  quantity?: number;
  capacityApproved?: boolean;
};

export type CreateWorkOrderInput = {
  customerId: string;
  propertyId: string;
  createdById: string;
  technicianId?: string | null;
  technicianIds?: string[];
  crewId?: string | null;
  jobLeaderId?: string | null;
  serviceId: string;
  /** @deprecated Use addOns so quantity is not lost. */
  addOnIds?: string[];
  addOns?: AddOnSelectionInput[];
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

type NormalizedAddOn = { serviceId: string; quantity: number; capacityApproved: boolean };

const CAPACITY_REVIEW_ADD_ONS = new Set(['laundry', 'ironing']);

const workOrderInclude = {
  customer: true,
  property: true,
  createdBy: true,
  technician: true,
  assignedTechnicians: { include: { technician: true }, orderBy: { technician: { lastName: 'asc' as const } } },
  jobLeader: true,
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
    const requestedAddOns = this.normalizeAddOns(input);
    const requestedTechnicianIds = [...new Set(input.technicianIds ?? (input.technicianId ? [input.technicianId] : []))];

    const [customer, property, user, service, technician, crew] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }),
      this.prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, customerId: true } }),
      this.prisma.user.findUnique({ where: { id: input.createdById }, select: { id: true } }),
      this.prisma.service.findUnique({ where: { id: input.serviceId }, select: { id: true, status: true, type: true } }),
      input.technicianId ? this.prisma.technician.findUnique({ where: { id: input.technicianId }, select: { id: true, status: true, firstName: true, lastName: true } }) : Promise.resolve(null),
      input.crewId ? this.prisma.crew.findUnique({ where: { id: input.crewId }, select: { id: true, name: true, leaderId: true, status: true, members: { where: { technician: { status: 'ACTIVE' } }, select: { technicianId: true } } } }) : Promise.resolve(null),
    ]);

    if (!customer) throw new NotFoundException('Customer not found.');
    if (!property) throw new NotFoundException('Property not found.');
    if (!user) throw new NotFoundException('Creating user not found.');
    if (!service) throw new NotFoundException('Service not found.');
    if (service.type !== ServiceType.PRIMARY && service.type !== ServiceType.BOTH) throw new BadRequestException('Primary service must be selectable as a primary service.');
    if (service.status !== ServiceStatus.ACTIVE) throw new BadRequestException('Select an active primary service for a new work order.');
    await this.validateAddOns(requestedAddOns);
    if (property.customerId !== input.customerId) throw new BadRequestException('Property does not belong to the selected customer.');
    if (input.technicianId && !technician) throw new NotFoundException('Technician not found.');
    if (technician?.status === 'INACTIVE') throw new BadRequestException('Inactive technicians cannot be assigned to new work orders.');
    if (input.crewId && !crew) throw new NotFoundException('Crew not found.');
    if (crew?.status === CrewStatus.INACTIVE) throw new BadRequestException('Inactive crews cannot be assigned to new work orders.');
    const effectiveTechnicianIds = input.technicianIds === undefined && input.technicianId === undefined && crew
      ? crew.members.map((member) => member.technicianId)
      : requestedTechnicianIds;
    await this.validateTechnicianAssignments(effectiveTechnicianIds);
    const jobLeaderId = this.resolveJobLeader(input.jobLeaderId, effectiveTechnicianIds, crew?.leaderId);

    const assigned = effectiveTechnicianIds.length > 0;
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
          technicianId: effectiveTechnicianIds[0] ?? null,
          assignedTechnicians: effectiveTechnicianIds.length ? { create: effectiveTechnicianIds.map((technicianId) => ({ technicianId })) } : undefined,
          crewId: input.crewId || null,
          jobLeaderId,
          serviceId: input.serviceId,
          frequency: input.frequency ?? null,
          customFrequencyNote: input.frequency === WorkOrderFrequency.CUSTOM ? input.customFrequencyNote?.trim() || null : null,
          homeCondition: input.homeCondition ?? null,
          addOns: requestedAddOns.length ? { create: requestedAddOns.map(({ serviceId, quantity }) => ({ serviceId, quantity })) } : undefined,
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
      if (effectiveTechnicianIds.length) activities.push({ workOrderId: workOrder.id, type: WorkOrderActivityType.TECHNICIAN_ASSIGNED, note: `Assigned technician IDs: ${effectiveTechnicianIds.join(', ')}`, actorId: input.createdById });
      if (input.crewId) activities.push({ workOrderId: workOrder.id, type: WorkOrderActivityType.CREW_ASSIGNED, note: `Crew: ${crew?.name}`, actorId: input.createdById });
      if (assigned) activities.push({ workOrderId: workOrder.id, type: WorkOrderActivityType.STATUS_CHANGED, previousStatus: WorkOrderStatus.NEW, newStatus: WorkOrderStatus.ASSIGNED, actorId: input.createdById });
      await tx.workOrderActivity.createMany({ data: activities });
      return workOrder;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async assignTechnicians(id: string, technicianIds: string[], crewId: string | null | undefined, requestedJobLeaderId: string | null | undefined, actorId: string) {
    const existing = await this.findOne(id);
    const uniqueIds = [...new Set(technicianIds.filter(Boolean))];
    await this.validateTechnicianAssignments(uniqueIds, existing.assignedTechnicians.map((item) => item.technicianId));
    let crew = existing.crew;
    if (crewId !== undefined && crewId) {
      crew = await this.prisma.crew.findUnique({ where: { id: crewId }, include: { leader: true, members: { include: { technician: true } } } });
      if (!crew) throw new NotFoundException('Crew not found.');
      if (crew.status === CrewStatus.INACTIVE && crewId !== existing.crewId) throw new BadRequestException('Inactive crews cannot be selected.');
    }
    const before = existing.assignedTechnicians.map((item) => item.technicianId);
    const added = uniqueIds.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !uniqueIds.includes(id));
    const nextCrewId = crewId === undefined ? existing.crewId : crewId || null;
    const crewChanged = nextCrewId !== existing.crewId;
    const jobLeaderId = this.resolveJobLeader(requestedJobLeaderId, uniqueIds, crewChanged ? crew?.leaderId : existing.jobLeaderId);
    const nextStatus = uniqueIds.length && existing.status === WorkOrderStatus.NEW ? WorkOrderStatus.ASSIGNED : existing.status;
    return this.prisma.$transaction(async (tx) => {
      await tx.workOrderTechnician.deleteMany({ where: { workOrderId: id } });
      if (uniqueIds.length) await tx.workOrderTechnician.createMany({ data: uniqueIds.map((technicianId) => ({ workOrderId: id, technicianId })) });
      const workOrder = await tx.workOrder.update({ where: { id }, data: { technicianId: uniqueIds[0] ?? null, crewId: nextCrewId, jobLeaderId, ...(nextStatus !== existing.status ? { status: nextStatus } : {}) }, include: workOrderInclude });
      const activities: Prisma.WorkOrderActivityCreateManyInput[] = [];
      if (added.length || removed.length) activities.push({ workOrderId: id, type: before.length ? WorkOrderActivityType.TECHNICIAN_CHANGED : WorkOrderActivityType.TECHNICIAN_ASSIGNED, note: `Added technician IDs: ${added.join(', ') || 'none'}; removed technician IDs: ${removed.join(', ') || 'none'}`, actorId });
      if (!uniqueIds.length && before.length) activities.push({ workOrderId: id, type: WorkOrderActivityType.TECHNICIAN_REMOVED, note: `Removed technician IDs: ${removed.join(', ')}`, actorId });
      if (crewChanged) activities.push({ workOrderId: id, type: nextCrewId ? (existing.crewId ? WorkOrderActivityType.CREW_CHANGED : WorkOrderActivityType.CREW_ASSIGNED) : WorkOrderActivityType.CREW_REMOVED, note: nextCrewId ? `Crew: ${crew?.name}` : `Crew removed: ${existing.crew?.name}`, actorId });
      if (jobLeaderId !== existing.jobLeaderId) activities.push({ workOrderId: id, type: WorkOrderActivityType.JOB_LEADER_CHANGED, note: `Job Leader changed from ${existing.jobLeaderId ?? 'unassigned'} to ${jobLeaderId ?? 'unassigned'}.`, actorId });
      if (nextStatus !== existing.status) activities.push({ workOrderId: id, type: WorkOrderActivityType.STATUS_CHANGED, previousStatus: existing.status, newStatus: nextStatus, actorId });
      if (activities.length) await tx.workOrderActivity.createMany({ data: activities });
      return workOrder;
    });
  }

  private resolveJobLeader(requested: string | null | undefined, technicianIds: string[], defaultLeader?: string | null) {
    if (!technicianIds.length) return null;
    if (technicianIds.length === 1) return technicianIds[0];
    const leaderId = requested === undefined ? defaultLeader : requested;
    if (!leaderId || !technicianIds.includes(leaderId)) throw new BadRequestException('Select one assigned Technician as Job Leader.');
    return leaderId;
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
      'awaiting-assignment': { status: WorkOrderStatus.NEW, assignedTechnicians: { none: {} } },
      'waiting-for-parts': { status: WorkOrderStatus.WAITING_FOR_PARTS },
      'high-priority': { status: { in: actionableStatuses }, priority: { in: [WorkOrderPriority.HIGH, WorkOrderPriority.URGENT] } },
      'today-unassigned': { status: { in: actionableStatuses }, assignedTechnicians: { none: {} }, scheduledAt: { gte: todayStart, lt: tomorrowStart } },
    };
    const where: Prisma.WorkOrderWhereInput = { status, priority, customerId, propertyId, ...(technicianId ? { assignedTechnicians: { some: { technicianId } } } : {}), crewId, ...(alert ? alertWhere[alert] : {}), ...(term ? { OR: [{ reference: { contains: term, mode: 'insensitive' } }, { title: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }, { customer: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { contactName: { contains: term, mode: 'insensitive' } }] } }, { property: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { addressLine1: { contains: term, mode: 'insensitive' } }] } }, { service: { name: { contains: term, mode: 'insensitive' } } }, { crew: { name: { contains: term, mode: 'insensitive' } } }] } : {}) };
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
    if (input.technicianId !== undefined || input.technicianIds !== undefined || input.crewId !== undefined) {
      throw new BadRequestException('Use the Work Order assignment endpoint to change Technicians or Crew.');
    }
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

    const addOnsChanged = input.addOns !== undefined || input.addOnIds !== undefined;
    const requestedAddOns = addOnsChanged ? this.normalizeAddOns(input) : [];
    if (addOnsChanged) {
      await this.validateAddOns(requestedAddOns, existing.addOns.map((item) => item.serviceId));
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
          ...(addOnsChanged ? { addOns: { deleteMany: {}, create: requestedAddOns.map(({ serviceId, quantity }) => ({ serviceId, quantity })) } } : {}),
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

  private async validateTechnicianAssignments(ids: string[], existingIds: string[] = []) {
    if (!ids.length) return;
    const technicians = await this.prisma.technician.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, employeeRecord: { select: { status: true } } } });
    if (technicians.length !== ids.length) throw new NotFoundException('One or more technicians were not found.');
    const ineligible = technicians.find((item) => !existingIds.includes(item.id) && (item.status === 'INACTIVE' || item.employeeRecord?.status === 'INACTIVE'));
    if (ineligible) throw new BadRequestException('Inactive technicians cannot be newly assigned to work orders.');
  }

  private normalizeAddOns(input: Pick<UpdateWorkOrderInput, 'addOns' | 'addOnIds'>): NormalizedAddOn[] {
    if (input.addOns !== undefined && input.addOnIds !== undefined) {
      throw new BadRequestException('Use either addOns or legacy addOnIds, not both.');
    }
    if (input.addOns !== undefined) {
      return input.addOns.map((addOn) => ({
        serviceId: addOn.serviceId,
        quantity: addOn.quantity ?? 1,
        capacityApproved: addOn.capacityApproved === true,
      }));
    }
    return (input.addOnIds ?? []).map((serviceId) => ({ serviceId, quantity: 1, capacityApproved: false }));
  }

  private validateQuoteFields(input: Pick<UpdateWorkOrderInput, 'frequency' | 'customFrequencyNote' | 'homeCondition' | 'addOnIds' | 'addOns'>) {
    if (input.frequency !== undefined && input.frequency !== null && !Object.values(WorkOrderFrequency).includes(input.frequency)) throw new BadRequestException('A valid work order frequency is required.');
    if (input.homeCondition !== undefined && input.homeCondition !== null && !Object.values(HomeCondition).includes(input.homeCondition)) throw new BadRequestException('A valid home condition is required.');
    if (input.customFrequencyNote?.trim() && input.frequency !== WorkOrderFrequency.CUSTOM) throw new BadRequestException('customFrequencyNote is only allowed for CUSTOM frequency.');
    if (input.addOnIds && new Set(input.addOnIds).size !== input.addOnIds.length) throw new BadRequestException('Duplicate add-on service IDs are not allowed.');
    if (input.addOns) {
      const ids = input.addOns.map((item) => item.serviceId);
      if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate add-on service IDs are not allowed.');
      if (input.addOns.some((item) => !item.serviceId || !Number.isInteger(item.quantity ?? 1) || (item.quantity ?? 1) < 1)) {
        throw new BadRequestException('Each add-on requires a serviceId and a positive integer quantity.');
      }
    }
  }

  private async validateAddOns(addOns: NormalizedAddOn[], existingIds: string[] = []) {
    if (!addOns.length) return;
    const ids = addOns.map((item) => item.serviceId);
    const services = await this.prisma.service.findMany({ where: { id: { in: ids } }, select: { id: true, type: true, status: true, normalizedName: true, name: true } });
    if (services.length !== ids.length) throw new NotFoundException('One or more add-on services were not found.');
    if (services.some((service) => service.type !== ServiceType.ADD_ON && service.type !== ServiceType.BOTH)) throw new BadRequestException('Add-ons must be selectable as add-ons.');
    if (services.some((service) => service.status !== ServiceStatus.ACTIVE && !existingIds.includes(service.id))) throw new BadRequestException('Only active add-ons can be newly assigned.');
    for (const addOn of addOns) {
      const service = services.find((item) => item.id === addOn.serviceId)!;
      const normalized = (service.normalizedName || service.name).trim().toLowerCase();
      if (CAPACITY_REVIEW_ADD_ONS.has(normalized) && !addOn.capacityApproved) {
        throw new BadRequestException(`${service.name} requires explicit labour/time capacity approval before it can be placed on a work order.`);
      }
    }
  }

  private assertTransition(previousStatus: WorkOrderStatus, newStatus: WorkOrderStatus) {
    if (previousStatus !== newStatus && !validTransitions[previousStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid work order status transition: ${previousStatus} to ${newStatus}.`);
    }
  }
}
