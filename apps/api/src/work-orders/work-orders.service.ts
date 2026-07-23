import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderActivityType, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateWorkOrderInput = {
  customerId: string;
  propertyId: string;
  createdById: string;
  technicianId?: string | null;
  title: string;
  description?: string;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  scheduledAt?: string;
  completedAt?: string;
};

export type UpdateWorkOrderInput = Partial<Omit<CreateWorkOrderInput, 'createdById'>>;
export type ChangeWorkOrderStatusInput = { status: WorkOrderStatus; note?: string; actorId?: string };

const workOrderInclude = { customer: true, property: true, createdBy: true, technician: true } as const;
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

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWorkOrderInput) {
    if (!input.customerId || !input.propertyId || !input.createdById || !input.title?.trim()) {
      throw new BadRequestException('customerId, propertyId, createdById and title are required.');
    }

    const [customer, property, user, technician] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }),
      this.prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, customerId: true } }),
      this.prisma.user.findUnique({ where: { id: input.createdById }, select: { id: true } }),
      input.technicianId ? this.prisma.technician.findUnique({ where: { id: input.technicianId }, select: { id: true, status: true, firstName: true, lastName: true } }) : Promise.resolve(null),
    ]);

    if (!customer) throw new NotFoundException('Customer not found.');
    if (!property) throw new NotFoundException('Property not found.');
    if (!user) throw new NotFoundException('Creating user not found.');
    if (property.customerId !== input.customerId) throw new BadRequestException('Property does not belong to the selected customer.');
    if (input.technicianId && !technician) throw new NotFoundException('Technician not found.');
    if (technician?.status === 'INACTIVE') throw new BadRequestException('Inactive technicians cannot be assigned to new work orders.');

    const initialStatus = input.technicianId ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.NEW;
    if (input.status && input.status !== initialStatus && !(input.status === WorkOrderStatus.NEW && input.technicianId)) {
      throw new BadRequestException(`New work orders must start as ${initialStatus}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          customerId: input.customerId, propertyId: input.propertyId, createdById: input.createdById,
          technicianId: input.technicianId || null, title: input.title.trim(), description: input.description?.trim() || null,
          status: initialStatus, priority: input.priority, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          completedAt: input.completedAt ? new Date(input.completedAt) : null,
        },
        include: workOrderInclude,
      });
      await tx.workOrderActivity.create({ data: { workOrderId: workOrder.id, type: WorkOrderActivityType.WORK_ORDER_CREATED, newStatus: WorkOrderStatus.NEW, actorId: input.createdById } });
      if (input.technicianId) {
        await tx.workOrderActivity.createMany({ data: [
          { workOrderId: workOrder.id, type: WorkOrderActivityType.TECHNICIAN_ASSIGNED, note: `Technician: ${technician?.firstName} ${technician?.lastName}`, actorId: input.createdById },
          { workOrderId: workOrder.id, type: WorkOrderActivityType.STATUS_CHANGED, previousStatus: WorkOrderStatus.NEW, newStatus: WorkOrderStatus.ASSIGNED, actorId: input.createdById },
        ] });
      }
      return workOrder;
    });
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: WorkOrderStatus, priority?: WorkOrderPriority, customerId?: string, propertyId?: string, technicianId?: string) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.WorkOrderWhereInput = { status, priority, customerId, propertyId, technicianId, ...(term ? { OR: [{ title: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }] } : {}) };
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

    const technicianChanged = input.technicianId !== undefined && input.technicianId !== existing.technicianId;
    const nextStatus = technicianChanged && input.technicianId && existing.status === WorkOrderStatus.NEW
      ? WorkOrderStatus.ASSIGNED
      : input.status ?? existing.status;
    this.assertTransition(existing.status, nextStatus);

    return this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.update({
        where: { id },
        data: {
          ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
          ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
          ...(input.technicianId !== undefined ? { technicianId: input.technicianId || null } : {}),
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
          ...(nextStatus !== existing.status ? { status: nextStatus } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
          ...(input.completedAt !== undefined ? { completedAt: input.completedAt ? new Date(input.completedAt) : null } : {}),
        }, include: workOrderInclude,
      });
      const activities: Prisma.WorkOrderActivityCreateManyInput[] = [];
      if (technicianChanged) activities.push({
        workOrderId: id,
        type: input.technicianId ? (existing.technicianId ? WorkOrderActivityType.TECHNICIAN_CHANGED : WorkOrderActivityType.TECHNICIAN_ASSIGNED) : WorkOrderActivityType.TECHNICIAN_REMOVED,
        note: input.technicianId
          ? existing.technician ? `Technician changed from ${existing.technician.firstName} ${existing.technician.lastName} to ${technician?.firstName} ${technician?.lastName}` : `Technician: ${technician?.firstName} ${technician?.lastName}`
          : `Technician removed: ${existing.technician?.firstName} ${existing.technician?.lastName}`,
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

  private assertTransition(previousStatus: WorkOrderStatus, newStatus: WorkOrderStatus) {
    if (previousStatus !== newStatus && !validTransitions[previousStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid work order status transition: ${previousStatus} to ${newStatus}.`);
    }
  }
}
