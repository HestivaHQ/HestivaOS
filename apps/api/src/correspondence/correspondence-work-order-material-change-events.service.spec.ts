import { ConflictException, NotFoundException } from '@nestjs/common';
import { CorrespondenceTemplateVersionStatus, UserRole, UserStatus, WorkOrderStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CorrespondenceWorkOrderEventsService } from './correspondence-work-order-events.service';

const actor = {
  id: '00000000-0000-0000-0000-000000000001',
  authUserId: '00000000-0000-0000-0000-000000000002',
  email: 'admin@example.com', firstName: 'Admin', lastName: 'User', displayName: 'Admin User',
  phoneNumber: null, profilePhotoUrl: null, role: UserRole.ADMIN, status: UserStatus.ACTIVE,
  jobTitle: null, department: null, createdAt: new Date(), updatedAt: new Date(),
};

const operationId = '00000000-0000-0000-0000-000000000010';
const workOrderId = '00000000-0000-0000-0000-000000000020';

function change(requestedChanges: Record<string, unknown>) {
  return {
    operation_id: operationId,
    work_order_id: workOrderId,
    actor_id: actor.id,
    stage: 'FUTURE',
    reason: 'Customer requested change',
    override_reason: null,
    previous_snapshot: { scheduledAt: '2026-08-25T08:00:00.000Z' },
    requested_changes: requestedChanges,
    consequences: { customerCorrespondenceEligible: true },
    created_at: new Date('2026-08-20T12:00:00Z'),
  };
}

function transaction() {
  return {
    $executeRaw: jest.fn(async () => 1),
    $queryRaw: jest.fn<any>(),
    correspondenceRecord: {
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(async ({ data }: any) => ({ id: 'record-1', ...data })),
    },
    workOrder: {
      findUnique: jest.fn(async () => ({
        id: workOrderId,
        reference: 'WO-20260820-0001',
        customer: { id: 'customer-1', name: 'Customer', contactName: 'Contact', email: 'customer@example.com', phone: '+27110000000' },
      })),
    },
    correspondenceTemplateVersion: {
      findUnique: jest.fn(async () => ({
        id: 'version-1', version: 1, status: CorrespondenceTemplateVersionStatus.PUBLISHED,
        subject: 'Changed', body: 'Your booking changed.', template: { key: 'booking_changed' },
      })),
    },
  };
}

describe('Correspondence Work Order material-change events', () => {
  let tx: ReturnType<typeof transaction>;
  let service: CorrespondenceWorkOrderEventsService;

  beforeEach(() => {
    tx = transaction();
    const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) } as any;
    service = new CorrespondenceWorkOrderEventsService(prisma);
  });

  it('materializes a reschedule from the immutable material-change operation', async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([change({ scheduledAt: '2026-08-27T08:00:00.000Z' })])
      .mockResolvedValueOnce([]);

    const result: any = await service.materializeReschedule(actor, workOrderId, operationId, { templateVersionId: 'version-1' });

    expect(result.provenance.eventIntegration).toEqual(expect.objectContaining({
      sourceEventKey: `work_order.material_change.rescheduled.v1:${operationId}`,
      eventType: 'WORK_ORDER_RESCHEDULED',
      operationId,
      requestedChanges: { scheduledAt: '2026-08-27T08:00:00.000Z' },
    }));
    expect(tx.correspondenceRecord.create).toHaveBeenCalledTimes(1);
  });

  it('materializes cancellation and gives cancellation precedence when schedule also changed', async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([change({ scheduledAt: null, status: WorkOrderStatus.CANCELLED })])
      .mockResolvedValueOnce([]);

    const result: any = await service.materializeCancellation(actor, workOrderId, operationId, { templateVersionId: 'version-1' });

    expect(result.provenance.eventIntegration).toEqual(expect.objectContaining({
      sourceEventKey: `work_order.material_change.cancelled.v1:${operationId}`,
      eventType: 'WORK_ORDER_CANCELLED',
    }));
  });

  it('rejects using the reschedule endpoint for a cancellation operation', async () => {
    tx.$queryRaw.mockResolvedValueOnce([change({ status: WorkOrderStatus.CANCELLED })]);
    await expect(service.materializeReschedule(actor, workOrderId, operationId, { templateVersionId: 'version-1' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });

  it('rejects using the cancellation endpoint for a reschedule operation', async () => {
    tx.$queryRaw.mockResolvedValueOnce([change({ scheduledAt: '2026-08-27T08:00:00.000Z' })]);
    await expect(service.materializeCancellation(actor, workOrderId, operationId, { templateVersionId: 'version-1' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });

  it('fails closed when the operation does not belong to the supplied Work Order', async () => {
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.materializeReschedule(actor, workOrderId, operationId, { templateVersionId: 'version-1' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });

  it('requires an explicitly selected published template version', async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([change({ scheduledAt: '2026-08-27T08:00:00.000Z' })])
      .mockResolvedValueOnce([]);
    tx.correspondenceTemplateVersion.findUnique.mockResolvedValueOnce({
      id: 'version-1', version: 1, status: CorrespondenceTemplateVersionStatus.DRAFT,
      subject: 'Changed', body: 'Your booking changed.', template: { key: 'booking_changed' },
    } as never);

    await expect(service.materializeReschedule(actor, workOrderId, operationId, { templateVersionId: 'version-1' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });

  it('returns the existing record when the same material-change event is replayed', async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([change({ scheduledAt: '2026-08-27T08:00:00.000Z' })])
      .mockResolvedValueOnce([{ id: 'existing-record' }]);
    tx.correspondenceRecord.findUniqueOrThrow.mockResolvedValueOnce({ id: 'existing-record' } as never);

    const result: any = await service.materializeReschedule(actor, workOrderId, operationId, { templateVersionId: 'version-1' });

    expect(result.id).toBe('existing-record');
    expect(tx.workOrder.findUnique).not.toHaveBeenCalled();
    expect(tx.correspondenceTemplateVersion.findUnique).not.toHaveBeenCalled();
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });
});
