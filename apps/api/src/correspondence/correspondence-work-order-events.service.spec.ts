import { ConflictException } from '@nestjs/common';
import { CorrespondenceTemplateVersionStatus, UserRole, UserStatus, WorkOrderStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CorrespondenceWorkOrderEventsService } from './correspondence-work-order-events.service';

const actor = {
  id: '00000000-0000-0000-0000-000000000001',
  authUserId: '00000000-0000-0000-0000-000000000002',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  displayName: 'Admin User',
  phoneNumber: null,
  profilePhotoUrl: null,
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  jobTitle: null,
  department: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: jest.fn(async () => 1),
    $queryRaw: jest.fn(async () => []),
    correspondenceRecord: {
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(async ({ data }: any) => ({ id: 'record-1', ...data })),
    },
    workOrder: {
      findUnique: jest.fn(async () => ({
        id: 'work-order-1',
        reference: 'WO-20260820-0001',
        status: WorkOrderStatus.COMPLETED,
        completionOperationId: '00000000-0000-0000-0000-000000000010',
        completedAt: new Date('2026-08-20T10:00:00Z'),
        completionAcknowledgedAt: new Date('2026-08-20T10:05:00Z'),
        completionCorrespondenceEligibleAt: new Date('2026-08-20T10:05:00Z'),
        customer: { id: 'customer-1', name: 'Customer', contactName: 'Contact', email: 'customer@example.com', phone: '+27110000000' },
      })),
    },
    correspondenceTemplateVersion: {
      findUnique: jest.fn(async () => ({
        id: 'version-1', version: 2, status: CorrespondenceTemplateVersionStatus.PUBLISHED,
        subject: 'Completed', body: 'Your service is complete.', template: { key: 'service_completed' },
      })),
    },
    ...overrides,
  };
}

describe('CorrespondenceWorkOrderEventsService', () => {
  let tx: ReturnType<typeof transaction>;
  let service: CorrespondenceWorkOrderEventsService;

  beforeEach(() => {
    tx = transaction();
    const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) } as any;
    service = new CorrespondenceWorkOrderEventsService(prisma);
  });

  it('materializes completion from acknowledged authoritative Work Order state without creating a delivery attempt', async () => {
    const result: any = await service.materializeCompletion(actor, 'work-order-1', { templateVersionId: 'version-1' });
    expect(result.templateKeySnapshot).toBe('service_completed');
    expect(result.recipientSnapshot).toEqual(expect.objectContaining({ customerId: 'customer-1', email: 'customer@example.com' }));
    expect(result.provenance).toEqual(expect.objectContaining({
      eventIntegration: expect.objectContaining({ sourceEventKey: 'work_order.completion_acknowledged.v1:work-order-1', eventType: 'COMPLETION_ACKNOWLEDGED' }),
    }));
    expect(tx.correspondenceRecord.create).toHaveBeenCalledTimes(1);
  });

  it('returns the existing record when the same source event is materialized again', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'existing-record' }]);
    tx.correspondenceRecord.findUniqueOrThrow.mockResolvedValueOnce({ id: 'existing-record' } as never);
    const result: any = await service.materializeCompletion(actor, 'work-order-1', { templateVersionId: 'version-1' });
    expect(result.id).toBe('existing-record');
    expect(tx.workOrder.findUnique).not.toHaveBeenCalled();
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });

  it('keeps acknowledged completion eligible after the Work Order is closed', async () => {
    tx.workOrder.findUnique.mockResolvedValueOnce({
      id: 'work-order-1', reference: 'WO-20260820-0001', status: WorkOrderStatus.CLOSED,
      completionOperationId: '00000000-0000-0000-0000-000000000010', completedAt: new Date('2026-08-20T10:00:00Z'),
      completionAcknowledgedAt: new Date('2026-08-20T10:05:00Z'), completionCorrespondenceEligibleAt: new Date('2026-08-20T10:05:00Z'),
      customer: { id: 'customer-1', name: 'Customer', contactName: null, email: 'customer@example.com', phone: null },
    } as never);
    await expect(service.materializeCompletion(actor, 'work-order-1', { templateVersionId: 'version-1' })).resolves.toEqual(expect.objectContaining({ id: 'record-1' }));
  });

  it('rejects completion that has not crossed the authoritative acknowledgement eligibility boundary', async () => {
    tx.workOrder.findUnique.mockResolvedValueOnce({
      id: 'work-order-1', reference: 'WO-20260820-0001', status: WorkOrderStatus.COMPLETED,
      completionOperationId: '00000000-0000-0000-0000-000000000010', completedAt: new Date(),
      completionAcknowledgedAt: null, completionCorrespondenceEligibleAt: null,
      customer: { id: 'customer-1', name: 'Customer', contactName: null, email: null, phone: null },
    } as never);
    await expect(service.materializeCompletion(actor, 'work-order-1', { templateVersionId: 'version-1' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });
});
