import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { assessMaterialChange } from './work-order-material-change.policy';
import { UpdateWorkOrderInput } from './work-orders.service';

export type MaterialChangePreviewInput = UpdateWorkOrderInput & {
  expectedUpdatedAt?: string;
};

@Injectable()
export class WorkOrderMaterialChangeService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(id: string, input: MaterialChangePreviewInput) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        status: true,
        updatedAt: true,
        customerId: true,
        propertyId: true,
        serviceId: true,
        frequency: true,
        customFrequencyNote: true,
        homeCondition: true,
        scheduledAt: true,
        completedAt: true,
        addOns: { select: { serviceId: true, quantity: true }, orderBy: { serviceId: 'asc' } },
      },
    });
    if (!workOrder) throw new NotFoundException('Work order not found.');

    if (input.expectedUpdatedAt && new Date(input.expectedUpdatedAt).getTime() !== workOrder.updatedAt.getTime()) {
      throw new ConflictException('The Work Order changed after this material-change review began. Reload and review the latest state.');
    }

    const assessment = assessMaterialChange(workOrder.status, input);
    return {
      workOrderId: workOrder.id,
      reference: workOrder.reference,
      expectedUpdatedAt: workOrder.updatedAt.toISOString(),
      currentStatus: workOrder.status,
      ...assessment,
      current: {
        customerId: workOrder.customerId,
        propertyId: workOrder.propertyId,
        serviceId: workOrder.serviceId,
        addOns: workOrder.addOns,
        frequency: workOrder.frequency,
        customFrequencyNote: workOrder.customFrequencyNote,
        homeCondition: workOrder.homeCondition,
        scheduledAt: workOrder.scheduledAt?.toISOString() ?? null,
        completedAt: workOrder.completedAt?.toISOString() ?? null,
      },
      requested: {
        customerId: input.customerId,
        propertyId: input.propertyId,
        serviceId: input.serviceId,
        addOns: input.addOns ?? (input.addOnIds ? input.addOnIds.map((serviceId) => ({ serviceId, quantity: 1 })) : undefined),
        frequency: input.frequency,
        customFrequencyNote: input.customFrequencyNote,
        homeCondition: input.homeCondition,
        scheduledAt: input.scheduledAt,
        cancellation: input.status === WorkOrderStatus.CANCELLED,
      },
      boundaries: {
        correspondence: assessment.consequences.customerCorrespondenceEligible
          ? 'Customer-facing correspondence is eligible after commit, but this slice does not send it directly.'
          : null,
        finance: assessment.consequences.financialReviewBoundary
          ? 'Financial consequences must be resolved by the future Finance runtime; this preview does not alter payment state.'
          : null,
      },
    };
  }

  async assertGenericUpdateAllowed(id: string, input: UpdateWorkOrderInput) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id }, select: { status: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    const assessment = assessMaterialChange(workOrder.status, input);
    if (assessment.materialFields.length > 0 && workOrder.status !== WorkOrderStatus.NEW) {
      throw new ConflictException('Confirmed Work Order material changes require the controlled material-change workflow.');
    }
  }

  async assertGenericCancellationAllowed(id: string, nextStatus: WorkOrderStatus) {
    if (nextStatus !== WorkOrderStatus.CANCELLED) return;
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id }, select: { status: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    if (workOrder.status !== WorkOrderStatus.NEW) {
      throw new ConflictException('Cancelling a confirmed Work Order requires the controlled material-change workflow.');
    }
  }
}
