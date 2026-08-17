import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TechnicianStatus, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type TechnicianListView = 'today' | 'upcoming' | 'recent' | 'cache';
export type StartJobInput = { operationId: string; startedAt: string; expectedVersion: string };
const PRE_START: WorkOrderStatus[] = [WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED, WorkOrderStatus.TRAVELLING];
const DAY = 86_400_000;

const technicianSelect = { id: true, firstName: true, lastName: true } as const;
const briefSelect = {
  id: true, reference: true, title: true, description: true, status: true, scheduledAt: true,
  preferredTimeWindow: true, updatedAt: true, startedAt: true, jobLeaderId: true,
  service: { select: { name: true, description: true } },
  addOns: { select: { quantity: true, service: { select: { name: true } } } },
  assignedTechnicians: { select: { technicianId: true, technician: { select: technicianSelect } } },
  property: { select: { name: true, addressLine1: true, addressLine2: true, city: true, province: true, postalCode: true,
    accessNotes: true, parkingNotes: true, bedrooms: true, bathrooms: true, livingAreas: true, storeys: true,
    floorSize: true, outdoorArea: true, hasPets: true, petNotes: true, hasCameras: true, offLimitsNotes: true,
    fragileItemNotes: true, productRestrictionNotes: true, allergyNotes: true } },
  accessInstructions: true, parkingInstructions: true, keyHandover: true, keyHandoverDetails: true,
  someonePresent: true, ecoFriendlyProducts: true, customerDeclaredExistingDamage: true,
} satisfies Prisma.WorkOrderSelect;

@Injectable()
export class TechnicianJobsService {
  constructor(private readonly prisma: PrismaService) {}

  private async technicianFor(userId: string) {
    const record = await this.prisma.employeeRecord.findFirst({
      where: { userId, status: 'ACTIVE', technician: { status: TechnicianStatus.ACTIVE } },
      select: { technicianId: true },
    });
    if (!record?.technicianId) throw new ForbiddenException('Technician access is not available for this account.');
    return record.technicianId;
  }

  private bounds(view: TechnicianListView, now = new Date()) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const tomorrow = new Date(start.getTime() + DAY);
    if (view === 'today') return { gte: start, lt: tomorrow };
    if (view === 'upcoming') return { gte: tomorrow };
    if (view === 'cache') return { gte: start, lt: new Date(start.getTime() + 3 * DAY) };
    if (view === 'recent') return { gte: new Date(start.getTime() - 30 * DAY), lt: start };
    throw new BadRequestException('Unknown Technician job view.');
  }

  async list(userId: string, view: TechnicianListView) {
    const technicianId = await this.technicianFor(userId);
    const scheduledAt = this.bounds(view);
    const jobs = await this.prisma.workOrder.findMany({
      where: { assignedTechnicians: { some: { technicianId } }, scheduledAt,
        ...(view === 'recent' ? {} : { status: { not: WorkOrderStatus.CANCELLED } }) },
      select: briefSelect, orderBy: { scheduledAt: 'asc' }, take: view === 'upcoming' ? 50 : 30,
    });
    return { technicianId, view, jobs: jobs.map((job) => this.dto(job, technicianId)), serverTime: new Date().toISOString() };
  }

  async brief(userId: string, id: string) {
    const technicianId = await this.technicianFor(userId);
    const job = await this.prisma.workOrder.findFirst({ where: { id, assignedTechnicians: { some: { technicianId } } }, select: briefSelect });
    if (!job) throw new NotFoundException('Assigned job was not found.');
    return this.dto(job, technicianId);
  }

  async start(userId: string, id: string, input: StartJobInput) {
    const technicianId = await this.technicianFor(userId);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.operationId)) throw new BadRequestException('A valid operation ID is required.');
    const fieldStartedAt = new Date(input.startedAt);
    const expectedVersion = new Date(input.expectedVersion);
    if (!Number.isFinite(fieldStartedAt.getTime()) || !Number.isFinite(expectedVersion.getTime())) throw new BadRequestException('Valid operation timestamps are required.');
    if (fieldStartedAt.getTime() > Date.now() + 5 * 60_000) throw new BadRequestException('Start time cannot be in the future.');

    await this.prisma.$transaction(async (tx) => {
      const job = await tx.workOrder.findFirst({ where: { id, assignedTechnicians: { some: { technicianId } } }, select: { id: true, status: true, updatedAt: true, jobLeaderId: true, startedAt: true, startOperationId: true, assignedTechnicians: { select: { technicianId: true } } } });
      if (!job) throw new NotFoundException('Assigned job was not found.');
      if (job.startOperationId === input.operationId && job.startedAt) return;
      if (job.startedAt || job.startOperationId) throw new ConflictException('This job was already started by another operation.');
      if (job.jobLeaderId !== technicianId) throw new ForbiddenException('Only the assigned Job Leader can start this job.');
      if (!job.assignedTechnicians.some((item) => item.technicianId === job.jobLeaderId)) throw new ConflictException('Job staffing must be corrected before starting.');
      if (!PRE_START.includes(job.status)) throw new ConflictException('This job cannot be started in its current state.');
      if (job.updatedAt.getTime() !== expectedVersion.getTime()) throw new ConflictException('The cached job changed. Refresh it before starting.');
      const result = await tx.workOrder.updateMany({ where: { id, startedAt: null, startOperationId: null, updatedAt: job.updatedAt, jobLeaderId: technicianId, status: { in: PRE_START } }, data: { startedAt: fieldStartedAt, startedByTechnicianId: technicianId, startOperationId: input.operationId, status: WorkOrderStatus.ON_SITE } });
      if (result.count !== 1) throw new ConflictException('The job changed while it was being started.');
      await tx.workOrderActivity.create({ data: { workOrderId: id, type: 'JOB_STARTED', actorId: userId, previousStatus: job.status, newStatus: WorkOrderStatus.ON_SITE, note: 'Started by the assigned Job Leader in Homent Technician.' } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.brief(userId, id);
  }

  private dto(job: any, technicianId: string) {
    return { ...job, isJobLeader: job.jobLeaderId === technicianId,
      canStart: job.jobLeaderId === technicianId && !job.startedAt && PRE_START.includes(job.status),
      waitingForJobLeader: job.jobLeaderId !== technicianId && !job.startedAt && PRE_START.includes(job.status),
      cacheable: job.status !== WorkOrderStatus.CANCELLED,
    };
  }
}
