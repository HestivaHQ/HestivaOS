import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const ACTIVE_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.DRAFT,
  WorkOrderStatus.OPEN,
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.ON_HOLD,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const groupedStatusesQuery = this.prisma.workOrder.groupBy({
      by: ['status'],
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const [customers, properties, openWorkOrders, completedWorkOrders, recentWorkOrders, groupedStatuses] =
      await this.prisma.$transaction([
        this.prisma.customer.count(),
        this.prisma.property.count(),
        this.prisma.workOrder.count({ where: { status: { in: ACTIVE_WORK_ORDER_STATUSES } } }),
        this.prisma.workOrder.count({ where: { status: WorkOrderStatus.COMPLETED } }),
        this.prisma.workOrder.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { customer: true, property: true, createdBy: true },
        }),
        groupedStatusesQuery,
      ]);

    const statusBreakdown = Object.values(WorkOrderStatus).reduce<Record<WorkOrderStatus, number>>(
      (result, status) => {
        result[status] = 0;
        return result;
      },
      {} as Record<WorkOrderStatus, number>,
    );

    for (const item of groupedStatuses) {
      statusBreakdown[item.status] = item._count._all;
    }

    return {
      totals: {
        customers,
        properties,
        openWorkOrders,
        completedWorkOrders,
      },
      recentWorkOrders,
      statusBreakdown,
    };
  }
}
