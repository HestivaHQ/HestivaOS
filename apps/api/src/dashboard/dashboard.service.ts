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

const TECHNICIAN_WORKLOAD_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.NEW,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.ACCEPTED,
  WorkOrderStatus.TRAVELLING,
  WorkOrderStatus.ON_SITE,
  WorkOrderStatus.WAITING_FOR_PARTS,
];

const OVERDUE_WORK_ORDER_STATUSES = ACTIVE_WORK_ORDER_STATUSES.filter((status) => status !== WorkOrderStatus.COMPLETED);

export const DASHBOARD_WORKLOAD_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.NEW,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.ACCEPTED,
  WorkOrderStatus.TRAVELLING,
  WorkOrderStatus.ON_SITE,
  WorkOrderStatus.COMPLETED,
];

const DASHBOARD_OVERDUE_STATUSES = DASHBOARD_WORKLOAD_STATUSES.filter((status) => status !== WorkOrderStatus.COMPLETED);
const JOHANNESBURG_OFFSET_MS = 2 * 60 * 60 * 1000;

export function getJohannesburgDayBoundaries(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const todayStart = new Date(Date.UTC(value('year'), value('month') - 1, value('day')) - JOHANNESBURG_OFFSET_MS);
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000);
  const upcomingEnd = new Date(tomorrowStart.getTime() + 7 * 86_400_000);
  return { todayStart, tomorrowStart, upcomingEnd };
}

export function buildTodayStatusBreakdown(workOrders: Array<{ status: WorkOrderStatus }>) {
  return DASHBOARD_WORKLOAD_STATUSES.reduce<Partial<Record<WorkOrderStatus, number>>>((result, status) => {
    result[status] = workOrders.filter((workOrder) => workOrder.status === status).length;
    return result;
  }, {});
}

export function buildUpcomingWorkSummary(workOrders: Array<{ scheduledAt: Date | null; technicianId: string | null; crewId: string | null }>) {
  const dates = new Map<string, { date: string; jobCount: number; unassignedCount: number }>();
  for (const workOrder of workOrders) {
    if (!workOrder.scheduledAt) continue;
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(workOrder.scheduledAt);
    const item = dates.get(date) ?? { date, jobCount: 0, unassignedCount: 0 };
    item.jobCount += 1;
    if (!workOrder.technicianId && !workOrder.crewId) item.unassignedCount += 1;
    dates.set(date, item);
  }
  return [...dates.values()].sort((left, right) => left.date.localeCompare(right.date));
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const { todayStart, tomorrowStart, upcomingEnd } = getJohannesburgDayBoundaries();
    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    const monthStart = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1));

    const groupedStatusesQuery = this.prisma.workOrder.groupBy({
      by: ['status'],
      orderBy: { status: 'asc' },
      _count: { _all: true },
    });

    const [customers, properties, openWorkOrders, completedWorkOrders, completedToday, overdueWorkOrders, activeTechnicians, awaitingAssignment, waitingForParts, highPriorityJobs, todayUnassignedJobs, completedThisWeek, completedThisMonth, actionableWorkOrders, completedWorkOrderTimings, recentWorkOrderActivities, todayScheduledWorkOrders, groupedStatuses, technicianWorkloadRecords, upcomingScheduledWorkOrders, overdueWorkOrderRecords] =
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
        this.prisma.workOrder.count({ where: { status: { in: DASHBOARD_OVERDUE_STATUSES }, technicianId: null, crewId: null, scheduledAt: { gte: todayStart, lt: tomorrowStart } } }),
        this.prisma.workOrderActivity.count({ where: { type: WorkOrderActivityType.STATUS_CHANGED, newStatus: WorkOrderStatus.COMPLETED, createdAt: { gte: weekStart, lt: tomorrowStart } } }),
        this.prisma.workOrderActivity.count({ where: { type: WorkOrderActivityType.STATUS_CHANGED, newStatus: WorkOrderStatus.COMPLETED, createdAt: { gte: monthStart, lt: tomorrowStart } } }),
        this.prisma.workOrder.count({ where: { status: { in: OVERDUE_WORK_ORDER_STATUSES } } }),
        this.prisma.workOrder.findMany({ where: { status: { not: WorkOrderStatus.CANCELLED }, completedAt: { not: null } }, select: { createdAt: true, completedAt: true, scheduledAt: true } }),
        this.prisma.workOrderActivity.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { actor: true, workOrder: { select: { id: true, title: true } } },
        }),
        this.prisma.workOrder.findMany({
          where: { status: { not: WorkOrderStatus.CANCELLED }, scheduledAt: { gte: todayStart, lt: tomorrowStart } },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
          include: { customer: true, property: true, createdBy: true, technician: true, crew: true },
        }),
        groupedStatusesQuery,
        this.prisma.technician.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            workOrders: {
              where: {
                OR: [
                  { status: { in: TECHNICIAN_WORKLOAD_STATUSES } },
                  { status: { not: WorkOrderStatus.CANCELLED }, scheduledAt: { gte: todayStart, lt: tomorrowStart } },
                ],
              },
              select: { status: true, priority: true, scheduledAt: true },
            },
          },
        }),
        this.prisma.workOrder.findMany({
          where: {
            status: { not: WorkOrderStatus.CANCELLED },
            scheduledAt: { gte: tomorrowStart, lt: upcomingEnd },
          },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
          include: { customer: true, property: true, createdBy: true, technician: true, crew: true },
        }),
        this.prisma.workOrder.findMany({
          where: {
            status: { in: OVERDUE_WORK_ORDER_STATUSES },
            scheduledAt: { lt: todayStart },
          },
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
          include: { customer: true, property: true, createdBy: true, technician: true },
        }),
      ]);

    const completedTimingCount = completedWorkOrderTimings.length;
    const averageCompletionTimeDays = completedTimingCount
      ? completedWorkOrderTimings.reduce((total, workOrder) => total + Math.max(0, workOrder.completedAt!.getTime() - workOrder.createdAt.getTime()) / 86_400_000, 0) / completedTimingCount
      : 0;
    const scheduledCompletions = completedWorkOrderTimings.filter((workOrder) => workOrder.scheduledAt);
    const onTimeCompletionRate = scheduledCompletions.length
      ? scheduledCompletions.filter((workOrder) => workOrder.completedAt! <= workOrder.scheduledAt!).length / scheduledCompletions.length * 100
      : 0;

    const technicianWorkload = technicianWorkloadRecords
      .map((technician) => {
        const technicianName = `${technician.firstName} ${technician.lastName}`.trim();
        const activeWorkOrders = technician.workOrders.filter((workOrder) => TECHNICIAN_WORKLOAD_STATUSES.includes(workOrder.status));
        return {
          technicianId: technician.id,
          technicianName,
          status: technician.status,
          activeWorkOrderCount: activeWorkOrders.length,
          scheduledTodayCount: technician.workOrders.filter((workOrder) => workOrder.status !== WorkOrderStatus.CANCELLED && workOrder.scheduledAt && workOrder.scheduledAt >= todayStart && workOrder.scheduledAt < tomorrowStart).length,
          highPriorityCount: activeWorkOrders.filter((workOrder) => workOrder.priority === 'HIGH' || workOrder.priority === 'URGENT').length,
        };
      })
      .sort((left, right) => right.activeWorkOrderCount - left.activeWorkOrderCount || right.highPriorityCount - left.highPriorityCount || left.technicianName.localeCompare(right.technicianName));

    const overdueWorkOrdersList = overdueWorkOrderRecords.map((workOrder) => ({
      ...workOrder,
      daysOverdue: Math.max(1, Math.floor((todayStart.getTime() - workOrder.scheduledAt!.getTime()) / 86_400_000)),
    }));

    const statusBreakdown = Object.values(WorkOrderStatus).reduce<Record<WorkOrderStatus, number>>(
      (result, status) => {
        result[status] = 0;
        return result;
      },
      {} as Record<WorkOrderStatus, number>,
    );

    for (const item of groupedStatuses) {
      const status = item.status as WorkOrderStatus;
      statusBreakdown[status] = item._count._all;
    }

    const todayStatusBreakdown = buildTodayStatusBreakdown(todayScheduledWorkOrders);
    const upcomingWorkSummary = buildUpcomingWorkSummary(upcomingScheduledWorkOrders);
    const upcomingUnassignedCount = upcomingWorkSummary.reduce((total, day) => total + day.unassignedCount, 0);
    const actionableOverdueWorkOrders = overdueWorkOrdersList.filter((workOrder) => DASHBOARD_OVERDUE_STATUSES.some((status) => status === workOrder.status));

    return {
      totals: { customers, properties, openWorkOrders, completedWorkOrders },
      statistics: { openWorkOrders, completedToday, overdueWorkOrders, activeTechnicians },
      alerts: { overdueWorkOrders, awaitingAssignment, waitingForParts, highPriorityJobs, todayUnassignedJobs },
      performanceMetrics: {
        averageCompletionTimeDays,
        completedToday,
        completedThisWeek,
        completedThisMonth,
        overduePercentage: actionableWorkOrders ? overdueWorkOrders / actionableWorkOrders * 100 : 0,
        onTimeCompletionRate,
        activeWorkOrders: actionableWorkOrders,
        averageJobsPerActiveTechnician: activeTechnicians ? actionableWorkOrders / activeTechnicians : 0,
      },
      technicianWorkload,
      recentWorkOrderActivities,
      todayScheduledWorkOrders,
      upcomingScheduledWorkOrders,
      overdueWorkOrdersList,
      statusBreakdown,
      operationalDashboard: {
        operationalDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(todayStart),
        todayStatusBreakdown,
        todayUnassignedJobs,
        actionableOverdueWorkOrders,
        upcomingWorkSummary,
        upcomingJobCount: upcomingScheduledWorkOrders.length,
        upcomingUnassignedCount,
      },
    };
  }
}
