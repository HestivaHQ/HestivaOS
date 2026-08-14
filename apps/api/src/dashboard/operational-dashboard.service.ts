import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  DASHBOARD_WORKLOAD_STATUSES,
  buildTodayStatusBreakdown,
  buildUpcomingWorkSummary,
  getJohannesburgDayBoundaries,
} from './dashboard.service';

const DASHBOARD_OVERDUE_STATUSES = DASHBOARD_WORKLOAD_STATUSES.filter(
  (status) => status !== WorkOrderStatus.COMPLETED,
);

@Injectable()
export class OperationalDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const { todayStart, tomorrowStart, upcomingEnd } =
      getJohannesburgDayBoundaries();

    const [todayScheduledWorkOrders, upcomingScheduledWorkOrders, overdueWorkOrderRecords] =
      await this.prisma.$transaction([
        this.prisma.workOrder.findMany({
          where: {
            status: { not: WorkOrderStatus.CANCELLED },
            scheduledAt: { gte: todayStart, lt: tomorrowStart },
          },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
          include: {
            customer: true,
            property: true,
            service: true,
            createdBy: true,
            technician: true,
            crew: true,
          },
        }),
        this.prisma.workOrder.findMany({
          where: {
            status: { not: WorkOrderStatus.CANCELLED },
            scheduledAt: { gte: tomorrowStart, lt: upcomingEnd },
          },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
          include: {
            customer: true,
            property: true,
            service: true,
            createdBy: true,
            technician: true,
            crew: true,
          },
        }),
        this.prisma.workOrder.findMany({
          where: {
            status: { in: DASHBOARD_OVERDUE_STATUSES },
            scheduledAt: { lt: todayStart },
          },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
          include: {
            customer: true,
            property: true,
            createdBy: true,
            technician: true,
            crew: true,
          },
        }),
      ]);

    const todayStatusBreakdown = buildTodayStatusBreakdown(
      todayScheduledWorkOrders,
    );
    const todayUnassignedJobs = todayScheduledWorkOrders.filter(
      (workOrder) =>
        DASHBOARD_OVERDUE_STATUSES.includes(workOrder.status) &&
        !workOrder.technicianId &&
        !workOrder.crewId,
    ).length;
    const upcomingWorkSummary = buildUpcomingWorkSummary(
      upcomingScheduledWorkOrders,
    );
    const upcomingUnassignedCount = upcomingWorkSummary.reduce(
      (total, day) => total + day.unassignedCount,
      0,
    );
    const overdueWorkOrdersList = overdueWorkOrderRecords.map((workOrder) => ({
      ...workOrder,
      daysOverdue: Math.max(
        1,
        Math.floor(
          (todayStart.getTime() - workOrder.scheduledAt!.getTime()) / 86_400_000,
        ),
      ),
    }));
    const statusBreakdown = Object.values(WorkOrderStatus).reduce<
      Record<WorkOrderStatus, number>
    >((result, status) => {
      result[status] = 0;
      return result;
    }, {} as Record<WorkOrderStatus, number>);

    return {
      totals: {
        customers: 0,
        properties: 0,
        openWorkOrders: 0,
        completedWorkOrders: 0,
      },
      statistics: {
        openWorkOrders: 0,
        completedToday: 0,
        overdueWorkOrders: overdueWorkOrdersList.length,
        activeTechnicians: 0,
      },
      alerts: {
        overdueWorkOrders: overdueWorkOrdersList.length,
        awaitingAssignment: 0,
        waitingForParts: 0,
        highPriorityJobs: 0,
        todayUnassignedJobs,
      },
      performanceMetrics: {
        averageCompletionTimeDays: 0,
        completedToday: 0,
        completedThisWeek: 0,
        completedThisMonth: 0,
        overduePercentage: 0,
        onTimeCompletionRate: 0,
        activeWorkOrders: 0,
        averageJobsPerActiveTechnician: 0,
      },
      technicianWorkload: [],
      recentWorkOrderActivities: [],
      todayScheduledWorkOrders,
      upcomingScheduledWorkOrders,
      overdueWorkOrdersList,
      statusBreakdown,
      operationalDashboard: {
        operationalDate: new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Johannesburg',
        }).format(todayStart),
        todayStatusBreakdown,
        todayUnassignedJobs,
        actionableOverdueWorkOrders: overdueWorkOrdersList,
        upcomingWorkSummary,
        upcomingJobCount: upcomingScheduledWorkOrders.length,
        upcomingUnassignedCount,
      },
    };
  }
}
