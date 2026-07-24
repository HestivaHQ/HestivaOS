import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateCustomerSignOffInput = { customerName: string; signatureDataUrl: string; note?: string };

@Injectable()
export class WorkOrderCustomerSignOffsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    return this.prisma.workOrderCustomerSignOff.findUnique({ where: { workOrderId } });
  }

  async create(workOrderId: string, input: CreateCustomerSignOffInput) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true, status: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    if (![WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED].includes(workOrder.status)) throw new BadRequestException('Customer sign-off is available only after the work order is completed.');
    if (!input.customerName?.trim()) throw new BadRequestException('Customer name is required.');
    if (!input.signatureDataUrl?.startsWith('data:image/png;base64,') || input.signatureDataUrl.length > 250_000) throw new BadRequestException('A valid signature is required.');
    const existing = await this.prisma.workOrderCustomerSignOff.findUnique({ where: { workOrderId }, select: { id: true } });
    if (existing) throw new ConflictException('This work order has already been signed off.');
    return this.prisma.workOrderCustomerSignOff.create({ data: { workOrderId, customerName: input.customerName.trim(), signatureDataUrl: input.signatureDataUrl, note: input.note?.trim() || null } });
  }
}
