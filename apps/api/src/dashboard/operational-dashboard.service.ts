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
const DASHBOARD_OVERDUE_STATUS_SET = new Set<WorkOrderStatus>(
  DASHBOARD_OVERDUE_STATUSES,
);

@Injectable()
export class OperationalDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const { todayStart, tomorrowStart, upcomingEnd } =
      getJohannesburgDayBoundaries();

    // These reads feed one best-effort operational snapshot and do not depend on
    // each other's results. Running them independently avoids serializing the
    // dashboard behind a single read-only transaction/connection.
    const [todayScheduledWorkOrders, upcomingScheduledWorkOrders, overdueWorkOrderRecords] =
      await Promise.all([
        this.prisma.workOrder.findMany({
          where: {
            status: { not: WorkOrderStatus.CANCELLED },
            scheduledAt: { gte: todayStart, lt: tomorrowStart },
          },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            reference: true,
            title: true,
            status: true,
            scheduledAt: true,
            technicianId: true,
            crewId: true,
            customer: {
              select: {
                name: true,
                contactName: true,
              },
            },
            property: {
              select: {
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                province: true,
              },
            },
            service: {
              select: {
                name: true,
              },
            },
            technician: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            crew: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.workOrder.findMany({
          where: {
            status: { not: WorkOrderStatus.CANCELLED },
            scheduledAt: { gte: tomorrowStart, lt: upcomingEnd },
          },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
          select: {
            scheduledAt: true,
            technicianId: true,
            crewId: true,
          },
        }),
        this.prisma.workOrder.findMany({
          where: {
            status: { in: DASHBOARD_OVERDUE_STATUSES },
            scheduledAt: { lt: todayStart },
          },
          select: {
            id: true,
          },
        }),
      ]);

    const todayStatusBreakdown = buildTodayStatusBreakdown(
      todayScheduledWorkOrders,
    );
    const todayUnassignedJobs = todayScheduledWorkOrders.filter(
      (workOrder) =>
        DASHBOARD_OVERDUE_STATUS_SET.has(workOrder.status as WorkOrderStatus) &&
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
    const overdueCount = overdueWorkOrderRecords.length;
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
        overdueWorkOrders: overdueCount,
        activeTechnicians: 0,
      },
      alerts: {
        overdueWorkOrders: overdueCount,
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
      upcomingScheduledWorkOrders: [],
      overdueWorkOrdersList: [],
      statusBreakdown,
      operationalDashboard: {
        operationalDate: new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Johannesburg',
        }).format(todayStart),
        todayStatusBreakdown,
        todayUnassignedJobs,
        actionableOverdueWorkOrders: overdueWorkOrderRecords,
        upcomingWorkSummary,
        upcomingJobCount: upcomingScheduledWorkOrders.length,
        upcomingUnassignedCount,
      },
    };
  }
}
