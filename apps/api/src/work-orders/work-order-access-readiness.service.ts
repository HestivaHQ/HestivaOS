import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkOrderAccessReadiness, WorkOrderActivityType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type UpdateAccessReadinessInput = {
  state: WorkOrderAccessReadiness;
};

const STATES = new Set(Object.values(WorkOrderAccessReadiness));

@Injectable()
export class WorkOrderAccessReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async history(workOrderId: string) {
    const exists = await this.prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Work order not found.');
    return this.prisma.workOrderAccessReadinessEvent.findMany({
      where: { workOrderId },
      select: {
        id: true, previousState: true, newState: true, createdAt: true,
        actor: { select: { id: true, firstName: true, lastName: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(workOrderId: string, input: UpdateAccessReadinessInput, actorId: string) {
    if (!STATES.has(input.state)) throw new BadRequestException('Select a valid access readiness state.');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true, accessReadiness: true } });
      if (!current) throw new NotFoundException('Work order not found.');
      if (current.accessReadiness === input.state) return tx.workOrder.findUniqueOrThrow({ where: { id: workOrderId }, select: { id: true, accessReadiness: true } });
      const updated = await tx.workOrder.update({ where: { id: workOrderId }, data: { accessReadiness: input.state }, select: { id: true, accessReadiness: true } });
      await tx.workOrderAccessReadinessEvent.create({ data: { workOrderId, previousState: current.accessReadiness, newState: input.state, actorId } });
      await tx.workOrderActivity.create({ data: {
        workOrderId, type: WorkOrderActivityType.ACCESS_READINESS_CHANGED, actorId,
        note: `Access readiness changed from ${current.accessReadiness} to ${input.state}.`,
      } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
