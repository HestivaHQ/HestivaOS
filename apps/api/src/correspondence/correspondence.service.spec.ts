import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CorrespondenceDeliveryAttemptStatus, CorrespondenceTemplateVersionStatus } from '@prisma/client';
import { CorrespondenceService } from './correspondence.service';

type TransactionCallback = (client: any) => unknown;

describe('CorrespondenceService', () => {
  const transaction = jest.fn<(callback: TransactionCallback) => unknown>();
  const createTemplate = jest.fn();
  const findTemplateVersion = jest.fn();
  const createRecord = jest.fn();
  const prisma = {
    $transaction: transaction,
    correspondenceTemplate: { create: createTemplate },
    correspondenceTemplateVersion: { findUnique: findTemplateVersion },
    correspondenceRecord: { create: createRecord },
  } as any;
  const service = new CorrespondenceService(prisma);
  const actor = {
    id: 'admin-1',
    authUserId: '11111111-1111-1111-1111-111111111111',
    email: 'admin@example.com',
    displayName: 'Admin User',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes the stable machine key before persistence', async () => {
    createTemplate.mockResolvedValue({ id: 'template-1' } as never);

    await service.create({ key: ' Booking Confirmation ', name: 'Booking confirmation', body: 'Hello' });

    expect(createTemplate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ key: 'booking_confirmation' }),
    }));
  });

  it('rejects a second draft for the same template', async () => {
    const tx = {
      correspondenceTemplate: { findUnique: jest.fn().mockResolvedValue({ id: 'template-1' } as never) },
      correspondenceTemplateVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'draft-1', status: CorrespondenceTemplateVersionStatus.DRAFT } as never),
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await expect(service.createVersion('template-1', { body: 'Next version' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('publishes a draft while retiring the previously published version atomically', async () => {
    const published = { id: 'draft-2', status: CorrespondenceTemplateVersionStatus.PUBLISHED };
    const tx = {
      correspondenceTemplateVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'draft-2', templateId: 'template-1', status: CorrespondenceTemplateVersionStatus.DRAFT } as never),
        updateMany: jest.fn().mockResolvedValue({ count: 1 } as never),
        update: jest.fn().mockResolvedValue(published as never),
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await expect(service.publish('template-1', 'draft-2')).resolves.toEqual(published);
    expect(tx.correspondenceTemplateVersion.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { templateId: 'template-1', status: CorrespondenceTemplateVersionStatus.PUBLISHED },
      data: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.RETIRED }),
    }));
    expect(tx.correspondenceTemplateVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'draft-2' },
      data: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.PUBLISHED }),
    }));
  });

  it('retires a published version inside the serialized lifecycle boundary', async () => {
    const retired = { id: 'version-1', status: CorrespondenceTemplateVersionStatus.RETIRED };
    const tx = {
      correspondenceTemplateVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'version-1', templateId: 'template-1', status: CorrespondenceTemplateVersionStatus.PUBLISHED } as never),
        update: jest.fn().mockResolvedValue(retired as never),
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await expect(service.retire('template-1', 'version-1')).resolves.toEqual(retired);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.correspondenceTemplateVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'version-1' },
      data: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.RETIRED }),
    }));
  });

  it('does not publish a missing version', async () => {
    const tx = { correspondenceTemplateVersion: { findFirst: jest.fn().mockResolvedValue(null as never) } };
    transaction.mockImplementation((callback) => callback(tx));

    await expect(service.publish('template-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('materializes the exact published content with template and actor provenance snapshots', async () => {
    findTemplateVersion.mockResolvedValue({
      id: 'version-2',
      version: 2,
      status: CorrespondenceTemplateVersionStatus.PUBLISHED,
      subject: 'Booking confirmed',
      body: 'Your booking is confirmed.',
      template: { id: 'template-1', key: 'booking_confirmation' },
    } as never);
    createRecord.mockResolvedValue({ id: 'record-1' } as never);

    await service.materialize(actor, {
      templateVersionId: 'version-2',
      recipientSnapshot: { customerId: 'customer-1', email: 'customer@example.com' },
      provenance: { sourceType: 'manual_test' },
    });

    expect(createRecord).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        templateVersionId: 'version-2',
        templateKeySnapshot: 'booking_confirmation',
        templateVersionNumber: 2,
        subject: 'Booking confirmed',
        body: 'Your booking is confirmed.',
        recipientSnapshot: { customerId: 'customer-1', email: 'customer@example.com' },
        provenance: {
          sourceType: 'manual_test',
          materializedBy: {
            userId: 'admin-1',
            authUserId: '11111111-1111-1111-1111-111111111111',
            email: 'admin@example.com',
            displayName: 'Admin User',
          },
        },
      }),
    }));
  });

  it('refuses to materialize a draft version', async () => {
    findTemplateVersion.mockResolvedValue({
      id: 'version-3',
      version: 3,
      status: CorrespondenceTemplateVersionStatus.DRAFT,
      subject: null,
      body: 'Draft',
      template: { id: 'template-1', key: 'booking_confirmation' },
    } as never);

    await expect(service.materialize({ id: 'admin-1' } as any, {
      templateVersionId: 'version-3',
      recipientSnapshot: { customerId: 'customer-1' },
    })).rejects.toBeInstanceOf(ConflictException);
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('requires recipient provenance to be a JSON object', async () => {
    await expect(service.materialize({ id: 'admin-1' } as any, {
      templateVersionId: 'version-2',
      recipientSnapshot: [] as unknown as Record<string, unknown>,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(findTemplateVersion).not.toHaveBeenCalled();
  });

  it('creates the first delivery attempt with an initial pending event and actor snapshot', async () => {
    const createAttempt = jest.fn().mockResolvedValue({ id: 'attempt-1', attemptNumber: 1 } as never);
    const tx = {
      correspondenceRecord: { findUnique: jest.fn().mockResolvedValue({ id: 'record-1' } as never) },
      correspondenceDeliveryAttempt: {
        findFirst: jest.fn().mockResolvedValue(null as never),
        create: createAttempt,
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await service.createDeliveryAttempt(actor, 'record-1', { routeSnapshot: { adapter: 'future-provider' } });

    expect(createAttempt).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        correspondenceRecordId: 'record-1',
        attemptNumber: 1,
        previousAttemptId: null,
        routeSnapshot: { adapter: 'future-provider' },
        events: {
          create: {
            status: CorrespondenceDeliveryAttemptStatus.PENDING,
            metadata: {
              initiatedBy: {
                userId: 'admin-1',
                authUserId: '11111111-1111-1111-1111-111111111111',
                email: 'admin@example.com',
                displayName: 'Admin User',
              },
            },
          },
        },
      }),
    }));
  });

  it('creates a retry only from the latest failed attempt', async () => {
    const createAttempt = jest.fn().mockResolvedValue({ id: 'attempt-2', attemptNumber: 2 } as never);
    const tx = {
      correspondenceRecord: { findUnique: jest.fn().mockResolvedValue({ id: 'record-1' } as never) },
      correspondenceDeliveryAttempt: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'attempt-1',
          attemptNumber: 1,
          events: [{ status: CorrespondenceDeliveryAttemptStatus.FAILED }],
        } as never),
        create: createAttempt,
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await service.createDeliveryAttempt(actor, 'record-1', {
      previousAttemptId: 'attempt-1',
      routeSnapshot: { adapter: 'future-provider', retry: true },
    });

    expect(createAttempt).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ attemptNumber: 2, previousAttemptId: 'attempt-1' }),
    }));
  });

  it('refuses to retry a pending delivery attempt', async () => {
    const tx = {
      correspondenceRecord: { findUnique: jest.fn().mockResolvedValue({ id: 'record-1' } as never) },
      correspondenceDeliveryAttempt: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'attempt-1',
          attemptNumber: 1,
          events: [{ status: CorrespondenceDeliveryAttemptStatus.PENDING }],
        } as never),
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await expect(service.createDeliveryAttempt(actor, 'record-1', {
      previousAttemptId: 'attempt-1',
      routeSnapshot: { adapter: 'future-provider' },
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('records one accepted terminal outcome with provider and actor snapshots', async () => {
    const createEvent = jest.fn().mockResolvedValue({ id: 'event-2', status: CorrespondenceDeliveryAttemptStatus.ACCEPTED } as never);
    const tx = {
      correspondenceDeliveryAttempt: { findUnique: jest.fn().mockResolvedValue({ id: 'attempt-1' } as never) },
      correspondenceDeliveryAttemptEvent: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(null as never)
          .mockResolvedValueOnce({ id: 'event-1' } as never),
        create: createEvent,
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await service.recordDeliveryOutcome(actor, 'attempt-1', {
      status: CorrespondenceDeliveryAttemptStatus.ACCEPTED,
      providerReference: 'provider-ref-1',
      metadata: { providerState: 'queued' },
    });

    expect(createEvent).toHaveBeenCalledWith({
      data: {
        attemptId: 'attempt-1',
        status: CorrespondenceDeliveryAttemptStatus.ACCEPTED,
        providerReference: 'provider-ref-1',
        failureCode: null,
        failureMessage: null,
        metadata: {
          providerState: 'queued',
          recordedBy: {
            userId: 'admin-1',
            authUserId: '11111111-1111-1111-1111-111111111111',
            email: 'admin@example.com',
            displayName: 'Admin User',
          },
        },
      },
    });
  });

  it('requires failure detail for a failed outcome', async () => {
    await expect(service.recordDeliveryOutcome(actor, 'attempt-1', {
      status: CorrespondenceDeliveryAttemptStatus.FAILED,
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('refuses a second terminal outcome for the same attempt', async () => {
    const tx = {
      correspondenceDeliveryAttempt: { findUnique: jest.fn().mockResolvedValue({ id: 'attempt-1' } as never) },
      correspondenceDeliveryAttemptEvent: {
        findFirst: jest.fn().mockResolvedValue({ id: 'terminal-1' } as never),
      },
    };
    transaction.mockImplementation((callback) => callback(tx));

    await expect(service.recordDeliveryOutcome(actor, 'attempt-1', {
      status: CorrespondenceDeliveryAttemptStatus.FAILED,
      failureMessage: 'Provider rejected request',
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
