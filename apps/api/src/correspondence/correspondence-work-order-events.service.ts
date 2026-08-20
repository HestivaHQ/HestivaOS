import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CorrespondenceTemplateVersionStatus, Prisma, User, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type MaterializeWorkOrderCompletionInput = { templateVersionId: string };

function actorSnapshot(actor: User): Prisma.InputJsonObject {
  return {
    userId: actor.id,
    authUserId: actor.authUserId,
    email: actor.email,
    displayName: actor.displayName ?? null,
  };
}

@Injectable()
export class CorrespondenceWorkOrderEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async materializeCompletion(actor: User, workOrderId: string, input: MaterializeWorkOrderCompletionInput) {
    return this.prisma.$transaction(async (tx) => {
      const sourceEventKey = `work_order.completion_acknowledged.v1:${workOrderId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`correspondence:${sourceEventKey}`}, 0))`;

      const existing = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM correspondence_records
        WHERE provenance -> 'eventIntegration' ->> 'sourceEventKey' = ${sourceEventKey}
        LIMIT 1
      `;
      if (existing[0]) {
        return tx.correspondenceRecord.findUniqueOrThrow({
          where: { id: existing[0].id },
          include: { templateVersion: { include: { template: true } } },
        });
      }

      const workOrder = await tx.workOrder.findUnique({
        where: { id: workOrderId },
        select: {
          id: true,
          reference: true,
          status: true,
          completionOperationId: true,
          completedAt: true,
          completionAcknowledgedAt: true,
          completionCorrespondenceEligibleAt: true,
          customer: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
        },
      });
      if (!workOrder) throw new NotFoundException('Work Order not found.');
      if (
        !workOrder.completionOperationId ||
        !workOrder.completionAcknowledgedAt ||
        !workOrder.completionCorrespondenceEligibleAt ||
        (workOrder.status !== WorkOrderStatus.COMPLETED && workOrder.status !== WorkOrderStatus.CLOSED)
      ) {
        throw new ConflictException('Work Order completion is not eligible for customer correspondence.');
      }

      const version = await tx.correspondenceTemplateVersion.findUnique({
        where: { id: input.templateVersionId },
        include: { template: true },
      });
      if (!version) throw new NotFoundException('Correspondence template version not found.');
      if (version.status !== CorrespondenceTemplateVersionStatus.PUBLISHED) {
        throw new ConflictException('Only a published correspondence template version can be materialized.');
      }

      const recipientSnapshot: Prisma.InputJsonObject = {
        customerId: workOrder.customer.id,
        name: workOrder.customer.name,
        contactName: workOrder.customer.contactName ?? null,
        email: workOrder.customer.email ?? null,
        phone: workOrder.customer.phone ?? null,
      };
      const provenance: Prisma.InputJsonObject = {
        eventIntegration: {
          sourceEventKey,
          sourceDomain: 'WORK_ORDER',
          eventType: 'COMPLETION_ACKNOWLEDGED',
          workOrderId: workOrder.id,
          workOrderReference: workOrder.reference ?? null,
          completionOperationId: workOrder.completionOperationId,
          completedAt: workOrder.completedAt?.toISOString() ?? null,
          acknowledgedAt: workOrder.completionAcknowledgedAt.toISOString(),
          correspondenceEligibleAt: workOrder.completionCorrespondenceEligibleAt.toISOString(),
        },
        materializedBy: actorSnapshot(actor),
      };

      return tx.correspondenceRecord.create({
        data: {
          templateVersionId: version.id,
          templateKeySnapshot: version.template.key,
          templateVersionNumber: version.version,
          subject: version.subject,
          body: version.body,
          recipientSnapshot,
          provenance,
        },
        include: { templateVersion: { include: { template: true } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
