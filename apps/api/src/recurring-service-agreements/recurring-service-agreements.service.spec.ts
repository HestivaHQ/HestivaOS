import { BadRequestException } from '@nestjs/common';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { RecurringServiceAgreementStatus, WorkOrderFrequency } from '@prisma/client';
import { RecurringServiceAgreementsService } from './recurring-service-agreements.service';

const agreement = {
  id: '8f53c779-174a-4a21-ae2d-8e87be4515a1',
  propertyId: '2335120a-0831-4754-afd9-cd5d569fe0c3',
  serviceId: '29416117-6cb4-49dd-a39d-0e83a0b912a5',
  frequency: WorkOrderFrequency.WEEKLY,
  status: RecurringServiceAgreementStatus.ACTIVE,
  effectiveDate: new Date('2026-08-03T00:00:00.000Z'),
  endDate: null,
  weekday: 'MONDAY',
  dayOfMonth: null,
  preferredTimeWindow: null,
  customFrequencyNote: null,
  recurringInstructions: null,
  ecoFriendlyProducts: null,
  nextServiceDate: new Date('2026-08-24T00:00:00.000Z'),
  autoResumeDate: null,
  property: { customer: {} },
  service: {},
  addOns: [],
  workOrders: [],
  _count: { workOrders: 0 },
};

describe('RecurringServiceAgreementsService auto resume', () => {
  afterEach(() => jest.useRealTimers());

  it('persists a future automatic resume date when pausing', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-19T12:00:00.000Z'));
    const update = jest.fn().mockResolvedValue({} as never);
    const prisma = { recurringServiceAgreement: { findUnique: jest.fn().mockResolvedValue(agreement as never), update } } as any;
    const service = new RecurringServiceAgreementsService(prisma);

    await service.changeStatus(agreement.id, { status: RecurringServiceAgreementStatus.PAUSED, autoResumeDate: '2026-08-25' });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: RecurringServiceAgreementStatus.PAUSED,
        autoResumeDate: new Date('2026-08-25T00:00:00.000Z'),
        nextServiceDate: agreement.nextServiceDate,
      }),
    }));
  });

  it('rejects an automatic resume date that is not after the Johannesburg business date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-19T12:00:00.000Z'));
    const prisma = { recurringServiceAgreement: { findUnique: jest.fn().mockResolvedValue(agreement as never) } } as any;
    const service = new RecurringServiceAgreementsService(prisma);

    await expect(service.changeStatus(agreement.id, { status: RecurringServiceAgreementStatus.PAUSED, autoResumeDate: '2026-08-19' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears automatic resume and recalculates recurrence on manual resume', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-19T12:00:00.000Z'));
    const paused = { ...agreement, status: RecurringServiceAgreementStatus.PAUSED, autoResumeDate: new Date('2026-08-25T00:00:00.000Z') };
    const update = jest.fn().mockResolvedValue({} as never);
    const prisma = { recurringServiceAgreement: { findUnique: jest.fn().mockResolvedValue(paused as never), update } } as any;
    const service = new RecurringServiceAgreementsService(prisma);

    await service.changeStatus(agreement.id, { status: RecurringServiceAgreementStatus.ACTIVE });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: RecurringServiceAgreementStatus.ACTIVE,
        autoResumeDate: null,
        nextServiceDate: new Date('2026-08-24T00:00:00.000Z'),
      }),
    }));
  });

  it('activates a due paused agreement exactly once and recalculates from today', async () => {
    const due = { ...agreement, status: RecurringServiceAgreementStatus.PAUSED, autoResumeDate: new Date('2026-08-19T00:00:00.000Z') };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 } as never);
    const prisma = { recurringServiceAgreement: { findMany: jest.fn().mockResolvedValue([due] as never), updateMany } } as any;
    const service = new RecurringServiceAgreementsService(prisma);

    await expect(service.resumeDueAgreements(new Date('2026-08-19T22:30:00.000Z'))).resolves.toEqual({ resumed: 1, ended: 0 });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: RecurringServiceAgreementStatus.PAUSED }),
      data: expect.objectContaining({ status: RecurringServiceAgreementStatus.ACTIVE, autoResumeDate: null }),
    }));
  });

  it('ends a due paused agreement when its end date has already passed', async () => {
    const due = { ...agreement, status: RecurringServiceAgreementStatus.PAUSED, endDate: new Date('2026-08-18T00:00:00.000Z'), autoResumeDate: new Date('2026-08-19T00:00:00.000Z') };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 } as never);
    const prisma = { recurringServiceAgreement: { findMany: jest.fn().mockResolvedValue([due] as never), updateMany } } as any;
    const service = new RecurringServiceAgreementsService(prisma);

    await expect(service.resumeDueAgreements(new Date('2026-08-19T12:00:00.000Z'))).resolves.toEqual({ resumed: 0, ended: 1 });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: RecurringServiceAgreementStatus.ENDED, autoResumeDate: null, nextServiceDate: null },
    }));
  });

  it('does not count a second runner that loses the conditional update race', async () => {
    const due = { ...agreement, status: RecurringServiceAgreementStatus.PAUSED, autoResumeDate: new Date('2026-08-19T00:00:00.000Z') };
    const prisma = { recurringServiceAgreement: { findMany: jest.fn().mockResolvedValue([due] as never), updateMany: jest.fn().mockResolvedValue({ count: 0 } as never) } } as any;
    const service = new RecurringServiceAgreementsService(prisma);

    await expect(service.resumeDueAgreements(new Date('2026-08-19T12:00:00.000Z'))).resolves.toEqual({ resumed: 0, ended: 0 });
  });
});
