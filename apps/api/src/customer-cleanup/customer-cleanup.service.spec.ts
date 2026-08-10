import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { CustomerCleanupService } from './customer-cleanup.service';

function harness(customer: { contactName: string | null; name: string } | null = { contactName: 'Customer A', name: 'Legacy A' }) {
  const tx: any = {
    customer: { findUnique: jest.fn().mockResolvedValue(customer as never), deleteMany: jest.fn().mockResolvedValue({ count: 1 } as never) },
    property: { count: jest.fn().mockResolvedValue(2 as never), deleteMany: jest.fn().mockResolvedValue({ count: 2 } as never) },
    workOrder: { count: jest.fn().mockResolvedValue(1 as never), deleteMany: jest.fn().mockResolvedValue({ count: 1 } as never) },
    workOrderActivity: { count: jest.fn().mockResolvedValue(3 as never), deleteMany: jest.fn().mockResolvedValue({ count: 3 } as never) },
    workOrderChecklistItem: { count: jest.fn().mockResolvedValue(4 as never), deleteMany: jest.fn().mockResolvedValue({ count: 4 } as never) },
    workOrderPhoto: { count: jest.fn().mockResolvedValue(2 as never), deleteMany: jest.fn().mockResolvedValue({ count: 2 } as never) },
    workOrderCustomerSignOff: { count: jest.fn().mockResolvedValue(1 as never), deleteMany: jest.fn().mockResolvedValue({ count: 1 } as never) },
    shift: { count: jest.fn().mockResolvedValue(1 as never), updateMany: jest.fn().mockResolvedValue({ count: 1 } as never) },
  };
  const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
  return { service: new CustomerCleanupService(prisma as never), tx, prisma };
}

describe('CustomerCleanupService', () => {
  it('returns authoritative owned-record impact counts and Contact name', async () => {
    const { service } = harness();
    await expect(service.impact('customer-a')).resolves.toMatchObject({ customerName: 'Customer A', customer: 1, properties: 2, workOrders: 1, activities: 3, checklistItems: 4, photos: 2, signOffs: 1, shiftsToDetach: 1 });
  });
  it('rejects a missing customer and an inexact confirmation before deletion', async () => {
    await expect(harness(null).service.impact('missing')).rejects.toBeInstanceOf(NotFoundException);
    const { service, tx } = harness();
    await expect(service.remove('admin', 'customer-a', 'customer a')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.customer.deleteMany).not.toHaveBeenCalled();
  });
  it('deletes only owned rows, detaches shifts, and reports actual transaction counts', async () => {
    const { service, tx } = harness();
    await expect(service.remove('admin', 'customer-a', 'Customer A')).resolves.toMatchObject({ customerDeleted: 1, propertiesDeleted: 2, workOrdersDeleted: 1, activitiesDeleted: 3, checklistItemsDeleted: 4, photosDeleted: 2, signOffsDeleted: 1, shiftsDetached: 1, storageObjectsDeleted: false, possibleOrphanedStorage: true });
    expect(tx.shift.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { workOrderId: null } }));
    expect(tx.workOrder.deleteMany).toHaveBeenCalledWith({ where: { customerId: 'customer-a' } });
  });
  it('propagates a child deletion failure through the single transaction', async () => {
    const { service, tx, prisma } = harness();
    tx.workOrderPhoto.deleteMany.mockRejectedValue(new Error('database failure'));
    await expect(service.remove('admin', 'customer-a', 'Customer A')).rejects.toThrow('database failure');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.customer.deleteMany).not.toHaveBeenCalled();
  });
});
