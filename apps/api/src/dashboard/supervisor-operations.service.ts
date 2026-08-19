import { Injectable } from '@nestjs/common';
import { ExecutionExceptionReason, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { getJohannesburgDayBoundaries } from './dashboard.service';

const ACTIVE = [WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED, WorkOrderStatus.TRAVELLING, WorkOrderStatus.ON_SITE, WorkOrderStatus.WAITING_FOR_PARTS];

/** A read-only, secret-free projection of existing Work Order execution truth. */
@Injectable()
export class SupervisorOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const { todayStart, tomorrowStart } = getJohannesburgDayBoundaries();
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        OR: [
          { scheduledAt: { gte: todayStart, lt: tomorrowStart }, status: { not: WorkOrderStatus.CANCELLED } },
          { status: { in: ACTIVE } },
          { status: WorkOrderStatus.INTERRUPTED },
          { status: WorkOrderStatus.COMPLETED, completionAcceptedAt: { not: null }, completionAcknowledgedAt: null },
          { incidents: { some: { status: { not: 'RESOLVED' } } } },
        ],
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, reference: true, title: true, status: true, scheduledAt: true,
        accessReadiness: true, startedAt: true, completionAcceptedAt: true, completionAcknowledgedAt: true,
        customer: { select: { name: true, contactName: true } },
        property: { select: { name: true, city: true } },
        service: { select: { name: true } },
        crew: { select: { name: true } },
        assignedTechnicians: { select: { technician: { select: { id: true, firstName: true, lastName: true } } } },
        jobLeader: { select: { id: true, firstName: true, lastName: true } },
        startedScopeRevision: { select: { sections: { select: { currentOutcome: true, currentOutcomeEvent: { select: { reason: true } }, evidence: { select: { syncState: true } } } } } },
        incidents: { where: { status: { not: 'RESOLVED' } }, select: { id: true, category: true, status: true, fieldReportedAt: true } },
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      workOrders: workOrders.map((job) => {
        const sections = job.startedScopeRevision?.sections ?? [];
        const evidence = sections.flatMap((section) => section.evidence);
        const mismatchCount = sections.filter((section) => section.currentOutcomeEvent?.reason === ExecutionExceptionReason.SCOPE_OR_CONDITION_MISMATCH).length;
        const completedSections = sections.filter((section) => section.currentOutcome !== 'PENDING').length;
        return {
          id: job.id, reference: job.reference ?? job.title, status: job.status, scheduledAt: job.scheduledAt,
          customerLabel: job.customer.contactName?.trim() || job.customer.name,
          propertyLabel: job.property.name || job.property.city,
          serviceName: job.service?.name ?? 'Cleaning service', crewName: job.crew?.name ?? null,
          technicians: job.assignedTechnicians.map(({ technician }) => technician), jobLeader: job.jobLeader,
          accessReadiness: job.accessReadiness,
          execution: { started: Boolean(job.startedAt), completedSections, totalSections: sections.length, evidenceCount: evidence.length, evidencePendingCount: evidence.filter((item) => item.syncState !== 'SERVER_ACKNOWLEDGED').length },
          completion: { acceptedAt: job.completionAcceptedAt, acknowledgedAt: job.completionAcknowledgedAt, acknowledgementRequired: Boolean(job.completionAcceptedAt && !job.completionAcknowledgedAt) },
          incidents: job.incidents,
          interruption: { interrupted: job.status === WorkOrderStatus.INTERRUPTED },
          scopeMismatch: { count: mismatchCount, requiresAdminResolution: mismatchCount > 0 },
        };
      }),
    };
  }
}
