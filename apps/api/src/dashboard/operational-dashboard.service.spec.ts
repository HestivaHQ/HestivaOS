import { WorkOrderStatus } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { OperationalDashboardService } from './operational-dashboard.service';
import { PrismaService } from '../prisma.service';

describe('OperationalDashboardService', () => {
  it('runs the three independent dashboard reads without a serial transaction', async () => {
    const findMany = jest
      .fn<(...args: any[]) => Promise<any[]>>()
      .mockResolvedValueOnce([
        {
          id: 'today-1',
          reference: 'WO-1',
          title: 'Today job',
          status: WorkOrderStatus.ASSIGNED,
          scheduledAt: new Date('2026-08-30T08:00:00.000Z'),
          technicianId: null,
          crewId: null,
          customer: { name: 'Customer', contactName: null },
          property: { name: 'Home', addressLine1: '1 Test St', addressLine2: null, city: 'Johannesburg', province: 'Gauteng' },
          service: { name: 'Cleaning' },
          technician: null,
          crew: null,
        },
      ])
      .mockResolvedValueOnce([
        { scheduledAt: new Date('2026-08-31T08:00:00.000Z'), technicianId: 'tech-1', crewId: null },
      ])
      .mockResolvedValueOnce([{ id: 'overdue-1' }]);
    const transaction = jest.fn(() => {
      throw new Error('dashboard reads must not be serialized in $transaction');
    });
    const prisma = {
      workOrder: { findMany },
      $transaction: transaction,
    } as unknown as PrismaService;

    const service = new OperationalDashboardService(prisma);
    const result = await service.getOverview();

    expect(transaction).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledTimes(3);
    expect(result.todayScheduledWorkOrders).toHaveLength(1);
    expect(result.operationalDashboard.actionableOverdueWorkOrders).toEqual([{ id: 'overdue-1' }]);
  });
});
