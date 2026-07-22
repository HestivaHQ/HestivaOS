import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateWorkOrderInput = {
  customerId: string;
  propertyId: string;
  createdById: string;
  title: string;
  description?: string;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  scheduledAt?: string;
  completedAt?: string;
};

export type UpdateWorkOrderInput = Partial<Omit<CreateWorkOrderInput, 'createdById'>>;

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateWorkOrderInput) {
    if (!input.customerId || !input.propertyId || !input.createdById || !input.title?.trim()) {
      throw new BadRequestException('customerId, propertyId, createdById and title are required.');
    }

    const [customer, property, user] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }),
      this.prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true, customerId: true } }),
      this.prisma.user.findUnique({ where: { id: input.createdById }, select: { id: true } }),
    ]);

    if (!customer) throw new NotFoundException('Customer not found.');
    if (!property) throw new NotFoundException('Property not found.');
    if (!user) throw new NotFoundException('Creating user not found.');
    if (property.customerId !== input.customerId) {
      throw new BadRequestException('Property does not belong to the selected customer.');
    }

    return this.prisma.workOrder.create({
      data: {
        customerId: input.customerId,
        propertyId: input.propertyId,
        createdById: input.createdById,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status,
        priority: input.priority,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
      },
      include: { customer: true, property: true, createdBy: true },
    });
  }

  async findAll(
    page = 1,
    pageSize = 20,
    search?: string,
    status?: WorkOrderStatus,
    priority?: WorkOrderPriority,
    customerId?: string,
    propertyId?: string,
  ) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const term = search?.trim();
    const where: Prisma.WorkOrderWhereInput = {
      status,
      priority,
      customerId,
      propertyId,
      ...(term ? { OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ] } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        where,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: { customer: true, property: true, createdBy: true },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { items, total, page: safePage, pageSize: safePageSize };
  }

  async findOne(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: { customer: true, property: true, createdBy: true },
    });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    return workOrder;
  }

  async update(id: string, input: UpdateWorkOrderInput) {
    const existing = await this.findOne(id);
    const customerId = input.customerId ?? existing.customerId;
    const propertyId = input.propertyId ?? existing.propertyId;

    if (input.customerId !== undefined || input.propertyId !== undefined) {
      const property = await this.prisma.property.findUnique({ where: { id: propertyId }, select: { customerId: true } });
      if (!property) throw new NotFoundException('Property not found.');
      if (property.customerId !== customerId) {
        throw new BadRequestException('Property does not belong to the selected customer.');
      }
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt ? new Date(input.completedAt) : null } : {}),
      },
      include: { customer: true, property: true, createdBy: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.workOrder.delete({ where: { id } });
  }
}
