import { BadRequestException } from '@nestjs/common';
import { WorkOrderAccessReadiness } from '@prisma/client';
import { WorkOrderAccessReadinessService } from './work-order-access-readiness.service';

describe('WorkOrderAccessReadinessService', () => {
  it('writes current readiness and append-only histories without changing lifecycle status', async () => {
    const tx = {
      workOrder: {
        findUnique: jest.fn<() => Promise<{id:string;accessReadiness:WorkOrderAccessReadiness}>>().mockResolvedValue({ id: 'wo', accessReadiness: WorkOrderAccessReadiness.REQUIRED_MISSING }),
        update: jest.fn<() => Promise<{id:string;accessReadiness:WorkOrderAccessReadiness}>>().mockResolvedValue({ id: 'wo', accessReadiness: WorkOrderAccessReadiness.RECEIVED }),
      },
      workOrderAccessReadinessEvent: { create: jest.fn<() => Promise<object>>().mockResolvedValue({}) },
      workOrderActivity: { create: jest.fn<() => Promise<object>>().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((work: (value: typeof tx) => unknown) => work(tx)) } as never;
    const result = await new WorkOrderAccessReadinessService(prisma).update('wo', { state: WorkOrderAccessReadiness.RECEIVED }, 'actor');
    expect(result.accessReadiness).toBe(WorkOrderAccessReadiness.RECEIVED);
    expect(tx.workOrder.update).toHaveBeenCalledWith({ where: { id: 'wo' }, data: { accessReadiness: WorkOrderAccessReadiness.RECEIVED }, select: { id: true, accessReadiness: true } });
    expect(tx.workOrderAccessReadinessEvent.create).toHaveBeenCalled();
    expect(tx.workOrderActivity.create).toHaveBeenCalled();
  });

  it('rejects arbitrary readiness state input', async () => {
    const service = new WorkOrderAccessReadinessService({} as never);
    await expect(service.update('wo', { state: 'FREE_FORM' as WorkOrderAccessReadiness }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
  });
});
import { describe, expect, it, jest } from '@jest/globals';
