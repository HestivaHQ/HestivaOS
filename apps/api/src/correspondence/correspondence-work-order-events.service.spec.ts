import { ConflictException } from '@nestjs/common';
import { CorrespondenceTemplateVersionStatus, QuoteStatus, UserRole, UserStatus, WorkOrderFrequency, WorkOrderStatus } from '@prisma/client';
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
    $queryRaw: jest.fn(async () => [] as Array<{ id: string }>),
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

function acceptedBookingWorkOrder() {
  return {
    id: 'work-order-1',
    reference: 'WO-20260820-0001',
    scheduledAt: new Date('2026-08-25T00:00:00+02:00'),
    recurrenceDate: null,
    preferredTimeWindow: 'MORNING',
    frequency: WorkOrderFrequency.ONE_TIME,
    customer: { id: 'customer-1', name: 'Customer', contactName: 'Contact', email: 'customer@example.com', phone: '+27110000000' },
    sourceQuote: {
      id: 'quote-1', reference: 'Q-20260820-0001', status: QuoteStatus.ACCEPTED,
      acceptedAt: new Date('2026-08-20T09:00:00Z'), acceptedByUserId: actor.id,
      acceptedRevisionId: 'revision-1', workOrderId: 'work-order-1',
    },
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

  it('materializes booking from the authoritative accepted Quote and linked Work Order without creating a delivery attempt', async () => {
    tx.workOrder.findUnique.mockResolvedValueOnce(acceptedBookingWorkOrder() as never);
    const result: any = await service.materializeBooking(actor, 'work-order-1', { templateVersionId: 'version-1' });
    expect(result.recipientSnapshot).toEqual(expect.objectContaining({ customerId: 'customer-1', email: 'customer@example.com' }));
    expect(result.provenance).toEqual(expect.objectContaining({
      eventIntegration: expect.objectContaining({
        sourceEventKey: 'quote.accepted.v1:quote-1', eventType: 'QUOTE_ACCEPTED_BOOKING_CREATED',
        quoteId: 'quote-1', workOrderId: 'work-order-1', acceptedRevisionId: 'revision-1',
      }),
    }));
    expect(tx.correspondenceRecord.create).toHaveBeenCalledTimes(1);
  });

  it('returns the existing booking record when the same accepted Quote event is materialized again', async () => {
    tx.workOrder.findUnique.mockResolvedValueOnce(acceptedBookingWorkOrder() as never);
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'existing-booking-record' }]);
    tx.correspondenceRecord.findUniqueOrThrow.mockResolvedValueOnce({ id: 'existing-booking-record' } as never);
    const result: any = await service.materializeBooking(actor, 'work-order-1', { templateVersionId: 'version-1' });
    expect(result.id).toBe('existing-booking-record');
    expect(tx.correspondenceTemplateVersion.findUnique).not.toHaveBeenCalled();
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });

  it('rejects a Work Order that is not backed by the authoritative accepted Quote link', async () => {
    tx.workOrder.findUnique.mockResolvedValueOnce({ ...acceptedBookingWorkOrder(), sourceQuote: null } as never);
    await expect(service.materializeBooking(actor, 'work-order-1', { templateVersionId: 'version-1' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
  });

  it('rejects inconsistent accepted Quote state instead of treating Work Order creation alone as booking confirmation', async () => {
    tx.workOrder.findUnique.mockResolvedValueOnce({
      ...acceptedBookingWorkOrder(),
      sourceQuote: { ...acceptedBookingWorkOrder().sourceQuote, status: QuoteStatus.SUBMITTED },
    } as never);
    await expect(service.materializeBooking(actor, 'work-order-1', { templateVersionId: 'version-1' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.correspondenceRecord.create).not.toHaveBeenCalled();
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
