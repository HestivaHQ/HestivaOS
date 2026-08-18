import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ServiceStatus,
  ServiceType,
  WorkOrderActivityType,
  WorkOrderFrequency,
  WorkOrderStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { assessMaterialChange } from './work-order-material-change.policy';
import { AddOnSelectionInput, UpdateWorkOrderInput } from './work-orders.service';

export type MaterialChangePreviewInput = UpdateWorkOrderInput & {
  expectedUpdatedAt?: string;
};

export type MaterialChangeCommitInput = UpdateWorkOrderInput & {
  operationId: string;
  expectedUpdatedAt: string;
  reason?: string;
  overrideReason?: string;
};

type MaterialChangeHistoryRow = {
  id: string;
  operation_id: string;
  work_order_id: string;
  actor_id: string;
  stage: string;
  request_hash: string;
  reason: string | null;
  override_reason: string | null;
  previous_snapshot: Prisma.JsonValue;
  requested_changes: Prisma.JsonValue;
  consequences: Prisma.JsonValue;
  created_at: Date;
};

type MaterialChangeWorkOrder = {
  id: string;
  reference: string | null;
  status: WorkOrderStatus;
  updatedAt: Date;
  customerId: string;
  propertyId: string;
  serviceId: string | null;
  frequency: WorkOrderFrequency | null;
  customFrequencyNote: string | null;
  homeCondition: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  addOns: { serviceId: string; quantity: number }[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAPACITY_REVIEW_ADD_ONS = new Set(['laundry', 'ironing']);

const materialChangeSelect = {
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
  addOns: { select: { serviceId: true, quantity: true }, orderBy: { serviceId: 'asc' as const } },
} as const;

@Injectable()
export class WorkOrderMaterialChangeService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(id: string, input: MaterialChangePreviewInput) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id }, select: materialChangeSelect });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    this.assertExpectedUpdatedAt(input.expectedUpdatedAt, workOrder.updatedAt, false);
    return this.buildPreview(workOrder, input);
  }

  async commit(id: string, input: MaterialChangeCommitInput, actorId: string) {
    this.validateCommitEnvelope(input);
    const request = this.normalizedRequest(input);
    const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex');

    const recovered = await this.findOperation(this.prisma, input.operationId);
    if (recovered) return this.recoverOperation(recovered, requestHash);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const existingOperation = await this.findOperation(tx, input.operationId);
          if (existingOperation) return this.recoverOperation(existingOperation, requestHash);

          const workOrder = await tx.workOrder.findUnique({ where: { id }, select: materialChangeSelect });
          if (!workOrder) throw new NotFoundException('Work order not found.');
          this.assertExpectedUpdatedAt(input.expectedUpdatedAt, workOrder.updatedAt, true);
          this.assertCommitOnlyContainsMaterialFields(input);

          const assessment = assessMaterialChange(workOrder.status, input);
          if (!assessment.materialFields.length) throw new BadRequestException('No material Work Order change was requested.');
          if (!assessment.allowed) throw new ConflictException(assessment.blockedReason ?? 'This material Work Order change is not allowed.');
          if (assessment.overrideReasonRequired && !this.validReason(input.overrideReason)) {
            throw new BadRequestException('An override reason of at least 3 characters is required for an imminent Work Order change.');
          }
          if (input.reason !== undefined && !this.validReason(input.reason)) {
            throw new BadRequestException('Material change reason must be between 3 and 500 characters when supplied.');
          }

          await this.validateReferences(tx, workOrder, input);
          const requestedAddOns = this.normalizeAddOns(input);
          if (input.addOns !== undefined || input.addOnIds !== undefined) {
            await this.validateAddOns(tx, requestedAddOns, workOrder.addOns.map((item) => item.serviceId));
          }

          const previousSnapshot = this.snapshot(workOrder);
          const nextStatus = input.status === WorkOrderStatus.CANCELLED ? WorkOrderStatus.CANCELLED : workOrder.status;
          const updated = await tx.workOrder.update({
            where: { id },
            data: {
              ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
              ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
              ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
              ...(input.frequency !== undefined
                ? {
                    frequency: input.frequency,
                    customFrequencyNote:
                      input.frequency === WorkOrderFrequency.CUSTOM ? input.customFrequencyNote?.trim() || null : null,
                  }
                : input.customFrequencyNote !== undefined
                  ? { customFrequencyNote: input.customFrequencyNote?.trim() || null }
                  : {}),
              ...(input.homeCondition !== undefined ? { homeCondition: input.homeCondition } : {}),
              ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
              ...((input.addOns !== undefined || input.addOnIds !== undefined)
                ? {
                    addOns: {
                      deleteMany: {},
                      create: requestedAddOns.map(({ serviceId, quantity }) => ({ serviceId, quantity })),
                    },
                  }
                : {}),
              ...(nextStatus !== workOrder.status ? { status: nextStatus } : {}),
            },
            select: materialChangeSelect,
          });

          if (nextStatus !== workOrder.status) {
            await tx.workOrderActivity.createMany({
              data: [
                {
                  workOrderId: id,
                  type: WorkOrderActivityType.STATUS_CHANGED,
                  previousStatus: workOrder.status,
                  newStatus: nextStatus,
                  note: input.reason?.trim() || input.overrideReason?.trim() || 'Controlled material Work Order change.',
                  actorId,
                },
                {
                  workOrderId: id,
                  type: WorkOrderActivityType.WORK_ORDER_CANCELLED,
                  previousStatus: workOrder.status,
                  newStatus: nextStatus,
                  note: input.reason?.trim() || input.overrideReason?.trim() || 'Cancelled through controlled material-change workflow.',
                  actorId,
                },
              ],
            });
          }

          const changeId = randomUUID();
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO "work_order_material_changes" (
              "id", "operation_id", "work_order_id", "actor_id", "stage", "request_hash",
              "reason", "override_reason", "previous_snapshot", "requested_changes", "consequences"
            ) VALUES (
              CAST(${changeId} AS UUID), CAST(${input.operationId} AS UUID), CAST(${id} AS UUID), CAST(${actorId} AS UUID),
              ${assessment.stage}, ${requestHash}, ${input.reason?.trim() || null}, ${input.overrideReason?.trim() || null},
              CAST(${JSON.stringify(previousSnapshot)} AS JSONB), CAST(${JSON.stringify(request)} AS JSONB),
              CAST(${JSON.stringify(assessment.consequences)} AS JSONB)
            )
          `);

          const materialChange = await this.findOperation(tx, input.operationId);
          if (!materialChange) throw new ConflictException('Material change audit record could not be recovered after commit.');
          return { workOrder: updated, materialChange: this.serializeHistory(materialChange), replayed: false };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const recoveredAfterError = await this.findOperation(this.prisma, input.operationId);
        if (recoveredAfterError) return this.recoverOperation(recoveredAfterError, requestHash);
        if (this.isRetryableTransactionError(error) && attempt < 2) continue;
        throw error;
      }
    }
    throw new ConflictException('Material change could not be committed after transaction retries.');
  }

  async list(id: string) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id }, select: { id: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');
    const rows = await this.prisma.$queryRaw<MaterialChangeHistoryRow[]>(Prisma.sql`
      SELECT * FROM "work_order_material_changes"
      WHERE "work_order_id" = CAST(${id} AS UUID)
      ORDER BY "created_at" ASC, "id" ASC
    `);
    return rows.map((row) => this.serializeHistory(row));
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

  private buildPreview(workOrder: MaterialChangeWorkOrder, input: MaterialChangePreviewInput) {
    const assessment = assessMaterialChange(workOrder.status, input);
    return {
      workOrderId: workOrder.id,
      reference: workOrder.reference,
      expectedUpdatedAt: workOrder.updatedAt.toISOString(),
      currentStatus: workOrder.status,
      ...assessment,
      current: this.snapshot(workOrder),
      requested: this.normalizedRequest(input),
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

  private validateCommitEnvelope(input: MaterialChangeCommitInput) {
    if (!UUID_PATTERN.test(input.operationId ?? '')) throw new BadRequestException('operationId must be a UUID generated once for this material change.');
    if (!input.expectedUpdatedAt || Number.isNaN(new Date(input.expectedUpdatedAt).getTime())) {
      throw new BadRequestException('expectedUpdatedAt from the latest material-change preview is required.');
    }
  }

  private assertExpectedUpdatedAt(expected: string | undefined, actual: Date, required: boolean) {
    if (required && !expected) throw new BadRequestException('expectedUpdatedAt is required.');
    if (!expected) return;
    const parsed = new Date(expected);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('expectedUpdatedAt must be a valid timestamp.');
    if (parsed.getTime() !== actual.getTime()) {
      throw new ConflictException('The Work Order changed after this material-change review began. Reload and review the latest state.');
    }
  }

  private assertCommitOnlyContainsMaterialFields(input: MaterialChangeCommitInput) {
    if (input.description !== undefined || input.priority !== undefined || input.technicianId !== undefined || input.technicianIds !== undefined || input.crewId !== undefined) {
      throw new BadRequestException('Use the ordinary Work Order or assignment endpoint for non-material internal fields.');
    }
    if (input.status !== undefined && input.status !== WorkOrderStatus.CANCELLED) {
      throw new BadRequestException('The material-change endpoint only accepts CANCELLED as a lifecycle change.');
    }
  }

  private async validateReferences(tx: Prisma.TransactionClient, current: MaterialChangeWorkOrder, input: MaterialChangeCommitInput) {
    const customerId = input.customerId ?? current.customerId;
    const propertyId = input.propertyId ?? current.propertyId;
    if (input.customerId !== undefined || input.propertyId !== undefined) {
      const [customer, property] = await Promise.all([
        tx.customer.findUnique({ where: { id: customerId }, select: { id: true } }),
        tx.property.findUnique({ where: { id: propertyId }, select: { id: true, customerId: true } }),
      ]);
      if (!customer) throw new NotFoundException('Customer not found.');
      if (!property) throw new NotFoundException('Property not found.');
      if (property.customerId !== customerId) throw new BadRequestException('Property does not belong to the selected customer.');
    }

    if (input.serviceId !== undefined) {
      const service = await tx.service.findUnique({ where: { id: input.serviceId }, select: { id: true, status: true, type: true } });
      if (!service) throw new NotFoundException('Service not found.');
      if (service.type !== ServiceType.PRIMARY && service.type !== ServiceType.BOTH) {
        throw new BadRequestException('Primary service must be selectable as a primary service.');
      }
      if (service.status !== ServiceStatus.ACTIVE && input.serviceId !== current.serviceId) {
        throw new BadRequestException('Select an active primary service.');
      }
    }

    if (input.frequency !== undefined && input.frequency !== null && !Object.values(WorkOrderFrequency).includes(input.frequency)) {
      throw new BadRequestException('A valid work order frequency is required.');
    }
    if (input.customFrequencyNote?.trim() && input.frequency !== WorkOrderFrequency.CUSTOM && current.frequency !== WorkOrderFrequency.CUSTOM) {
      throw new BadRequestException('customFrequencyNote is only allowed for CUSTOM frequency.');
    }
  }

  private normalizeAddOns(input: Pick<MaterialChangeCommitInput, 'addOns' | 'addOnIds'>) {
    if (input.addOns !== undefined && input.addOnIds !== undefined) throw new BadRequestException('Use either addOns or legacy addOnIds, not both.');
    const addOns: AddOnSelectionInput[] = input.addOns ?? (input.addOnIds ?? []).map((serviceId) => ({ serviceId, quantity: 1 }));
    const ids = addOns.map((item) => item.serviceId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate add-on service IDs are not allowed.');
    if (addOns.some((item) => !item.serviceId || !Number.isInteger(item.quantity ?? 1) || (item.quantity ?? 1) < 1)) {
      throw new BadRequestException('Each add-on requires a serviceId and a positive integer quantity.');
    }
    return addOns.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity ?? 1, capacityApproved: item.capacityApproved === true }));
  }

  private async validateAddOns(tx: Prisma.TransactionClient, addOns: ReturnType<WorkOrderMaterialChangeService['normalizeAddOns']>, existingIds: string[]) {
    if (!addOns.length) return;
    const ids = addOns.map((item) => item.serviceId);
    const services = await tx.service.findMany({ where: { id: { in: ids } }, select: { id: true, type: true, status: true, normalizedName: true, name: true } });
    if (services.length !== ids.length) throw new NotFoundException('One or more add-on services were not found.');
    if (services.some((service) => service.type !== ServiceType.ADD_ON && service.type !== ServiceType.BOTH)) {
      throw new BadRequestException('Add-ons must be selectable as add-ons.');
    }
    if (services.some((service) => service.status !== ServiceStatus.ACTIVE && !existingIds.includes(service.id))) {
      throw new BadRequestException('Only active add-ons can be newly assigned.');
    }
    for (const addOn of addOns) {
      const service = services.find((item) => item.id === addOn.serviceId)!;
      const normalized = (service.normalizedName || service.name).trim().toLowerCase();
      if (CAPACITY_REVIEW_ADD_ONS.has(normalized) && !addOn.capacityApproved) {
        throw new BadRequestException(`${service.name} requires explicit labour/time capacity approval before it can be placed on a work order.`);
      }
    }
  }

  private snapshot(workOrder: MaterialChangeWorkOrder) {
    return {
      customerId: workOrder.customerId,
      propertyId: workOrder.propertyId,
      serviceId: workOrder.serviceId,
      addOns: workOrder.addOns,
      frequency: workOrder.frequency,
      customFrequencyNote: workOrder.customFrequencyNote,
      homeCondition: workOrder.homeCondition,
      scheduledAt: workOrder.scheduledAt?.toISOString() ?? null,
      completedAt: workOrder.completedAt?.toISOString() ?? null,
      status: workOrder.status,
      updatedAt: workOrder.updatedAt.toISOString(),
    };
  }

  private normalizedRequest(input: MaterialChangePreviewInput) {
    const addOns = input.addOns
      ? input.addOns.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity ?? 1, capacityApproved: item.capacityApproved === true })).sort((a, b) => a.serviceId.localeCompare(b.serviceId))
      : input.addOnIds
        ? input.addOnIds.map((serviceId) => ({ serviceId, quantity: 1, capacityApproved: false })).sort((a, b) => a.serviceId.localeCompare(b.serviceId))
        : undefined;
    return {
      customerId: input.customerId,
      propertyId: input.propertyId,
      serviceId: input.serviceId,
      addOns,
      frequency: input.frequency,
      customFrequencyNote: input.customFrequencyNote?.trim() || undefined,
      homeCondition: input.homeCondition,
      scheduledAt: input.scheduledAt,
      cancellation: input.status === WorkOrderStatus.CANCELLED,
      reason: 'reason' in input ? (input as MaterialChangeCommitInput).reason?.trim() || undefined : undefined,
      overrideReason: 'overrideReason' in input ? (input as MaterialChangeCommitInput).overrideReason?.trim() || undefined : undefined,
    };
  }

  private validReason(value?: string) {
    const length = value?.trim().length ?? 0;
    return length >= 3 && length <= 500;
  }

  private async findOperation(db: PrismaService | Prisma.TransactionClient, operationId: string) {
    if (!UUID_PATTERN.test(operationId ?? '')) return null;
    const rows = await db.$queryRaw<MaterialChangeHistoryRow[]>(Prisma.sql`
      SELECT * FROM "work_order_material_changes"
      WHERE "operation_id" = CAST(${operationId} AS UUID)
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private recoverOperation(row: MaterialChangeHistoryRow, requestHash: string) {
    if (row.request_hash !== requestHash) {
      throw new ConflictException('operationId was already used for a different material Work Order change.');
    }
    return { materialChange: this.serializeHistory(row), replayed: true };
  }

  private serializeHistory(row: MaterialChangeHistoryRow) {
    return {
      id: row.id,
      operationId: row.operation_id,
      workOrderId: row.work_order_id,
      actorId: row.actor_id,
      stage: row.stage,
      reason: row.reason,
      overrideReason: row.override_reason,
      previousSnapshot: row.previous_snapshot,
      requestedChanges: row.requested_changes,
      consequences: row.consequences,
      createdAt: row.created_at.toISOString(),
    };
  }

  private isRetryableTransactionError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || error.code === 'P2002');
  }
}
