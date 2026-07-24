import { Injectable } from '@nestjs/common';
import { WorkOrderActivityType, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

const ACTIVE_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.NEW,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.ACCEPTED,
  WorkOrderStatus.TRAVELLING,
  WorkOrderStatus.ON_SITE,
  WorkOrderStatus.WAITING_FOR_PARTS,
  WorkOrderStatus.COMPLETED,
];

const OVERDUE_WORK_ORDER_STATUSES = ACTIVE_WORK_ORDER_STATUSES.filter((status) => status !== WorkOrderStatus.COMPLETED);

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    const groupedStatusesQuery = this.prisma.workOrder.groupBy({
      by: ['status'],
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const [customers, properties, openWorkOrders, completedWorkOrders, completedToday, overdueWorkOrders, activeTechnicians, awaitingAssignment, waitingForParts, highPriorityJobs, todayUnassignedJobs, recentWorkOrderActivities, todayScheduledWorkOrders, groupedStatuses] =
    const [customers, properties, openWorkOrders, completedWorkOrders, completedToday, overdueWorkOrders, activeTechnicians, recentWorkOrderActivities, todayScheduledWorkOrders, groupedStatuses] =
      await this.prisma.$transaction([
        this.prisma.customer.count(),
        this.prisma.property.count(),
        this.prisma.workOrder.count({ where: { status: { in: ACTIVE_WORK_ORDER_STATUSES } } }),
        this.prisma.workOrder.count({ where: { status: WorkOrderStatus.COMPLETED } }),
        this.prisma.workOrderActivity.count({ where: { type: WorkOrderActivityType.STATUS_CHANGED, newStatus: WorkOrderStatus.COMPLETED, createdAt: { gte: todayStart, lt: tomorrowStart } } }),
        this.prisma.workOrder.count({ where: { status: { in: OVERDUE_WORK_ORDER_STATUSES }, scheduledAt: { lt: todayStart } } }),
        this.prisma.technician.count({ where: { status: 'ACTIVE' } }),
        this.prisma.workOrder.count({ where: { status: WorkOrderStatus.NEW, technicianId: null } }),
        this.prisma.workOrder.count({ where: { status: WorkOrderStatus.WAITING_FOR_PARTS } }),
        this.prisma.workOrder.count({ where: { status: { in: OVERDUE_WORK_ORDER_STATUSES }, priority: { in: ['HIGH', 'URGENT'] } } }),
        this.prisma.workOrder.count({ where: { status: { in: OVERDUE_WORK_ORDER_STATUSES }, technicianId: null, scheduledAt: { gte: todayStart, lt: tomorrowStart } } }),
        this.prisma.workOrderActivity.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { actor: true, workOrder: { select: { id: true, title: true } } },
        }),
        this.prisma.workOrder.findMany({
          where: { scheduledAt: { gte: todayStart, lt: tomorrowStart } },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
          include: { customer: true, property: true, createdBy: true, technician: true },
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
      statistics: { openWorkOrders, completedToday, overdueWorkOrders, activeTechnicians },
      alerts: { overdueWorkOrders, awaitingAssignment, waitingForParts, highPriorityJobs, todayUnassignedJobs },
      recentWorkOrderActivities,
      todayScheduledWorkOrders,
      statusBreakdown,
    };
  }
}
