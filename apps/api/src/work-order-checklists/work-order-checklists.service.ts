import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderChecklistItemStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateChecklistItemInput = { description: string };
export type UpdateChecklistItemInput = { description?: string; status?: WorkOrderChecklistItemStatus; sortOrder?: number };

@Injectable()
export class WorkOrderChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireWorkOrder(workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');
  }

  async findAll(workOrderId: string) {
    await this.requireWorkOrder(workOrderId);
    return this.prisma.workOrderChecklistItem.findMany({ where: { workOrderId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(workOrderId: string, input: CreateChecklistItemInput) {
    await this.requireWorkOrder(workOrderId);
    const description = input.description?.trim();
    if (!description) throw new BadRequestException('Checklist item description is required.');
    const last = await this.prisma.workOrderChecklistItem.findFirst({ where: { workOrderId }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return this.prisma.workOrderChecklistItem.create({ data: { workOrderId, description, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  }

  async update(workOrderId: string, id: string, input: UpdateChecklistItemInput) {
    const existing = await this.prisma.workOrderChecklistItem.findFirst({ where: { id, workOrderId } });
    if (!existing) throw new NotFoundException('Checklist item not found.');
    if (input.description !== undefined && !input.description.trim()) throw new BadRequestException('Checklist item description cannot be empty.');
    return this.prisma.workOrderChecklistItem.update({ where: { id }, data: {
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    } });
  }

  async remove(workOrderId: string, id: string) {
    const existing = await this.prisma.workOrderChecklistItem.findFirst({ where: { id, workOrderId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Checklist item not found.');
    return this.prisma.workOrderChecklistItem.delete({ where: { id } });
  }
}
