import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttentionActivityType,
  AttentionItem,
  AttentionItemType,
  AttentionPriority,
  AttentionQueue,
  AttentionState,
  Prisma,
  User,
  UserRole,
  UserStatus,
  WorkOrderStatus,
  WorkOrderAccessReadiness,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { getJohannesburgDayBoundaries } from '../dashboard/dashboard.service';
import {
  canOwnAttentionQueue,
  compareAttentionItems,
  eligibleQueuesForRole,
} from './attention-policy';
import { accessAttentionPriority, isAccessOperationallyResolved } from '../work-orders/access-operations-policy';

const UNRESOLVED_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.NEW,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.ACCEPTED,
  WorkOrderStatus.TRAVELLING,
  WorkOrderStatus.ON_SITE,
  WorkOrderStatus.WAITING_FOR_PARTS,
];

const MANAGED_ATTENTION_TYPES: AttentionItemType[] = [
  AttentionItemType.TODAY_UNASSIGNED_WORK_ORDER,
  AttentionItemType.OVERDUE_WORK_ORDER,
  AttentionItemType.COMPLETION_ACKNOWLEDGEMENT_REQUIRED,
  AttentionItemType.WORK_ORDER_ACCESS_REQUIRED,
  AttentionItemType.WORK_ORDER_INCIDENT_REVIEW_REQUIRED,
];

const ATTENTION_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
  UserRole.DISPATCHER,
  UserRole.SUPERVISOR,
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const workOrderAttentionSelect = {
  id: true,
  reference: true,
  title: true,
  scheduledAt: true,
  completionAcceptedAt: true,
  accessReadiness: true,
  temporaryAccessCredentials: {
    select: { reviewStatus: true, validFrom: true, expiresAt: true, revokedAt: true },
  },
  customer: { select: { name: true, contactName: true } },
  service: { select: { name: true } },
} satisfies Prisma.WorkOrderSelect;

type AttentionWorkOrder = Prisma.WorkOrderGetPayload<{
  select: typeof workOrderAttentionSelect;
}>;

type AttentionCandidate = {
  conditionKey: string;
  type: AttentionItemType;
  priority: AttentionPriority;
  queue: AttentionQueue;
  subjectType: 'WORK_ORDER';
  subjectId: string;
  subjectReference: string;
  customerLabel: string;
  title: string;
  summary: string;
  actionLabel: string;
  actionHref: string;
  dueAt: Date | null;
};

function displayReference(workOrder: AttentionWorkOrder): string {
  return workOrder.reference ?? workOrder.title;
}

function customerLabel(workOrder: AttentionWorkOrder): string {
  return workOrder.customer.contactName?.trim() || workOrder.customer.name;
}

function serviceLabel(workOrder: AttentionWorkOrder): string {
  return workOrder.service?.name ?? 'Cleaning service';
}

function candidateFor(
  workOrder: AttentionWorkOrder,
  type: AttentionItemType,
  now: Date,
): AttentionCandidate {
  const reference = displayReference(workOrder);
  const customer = customerLabel(workOrder);
  const service = serviceLabel(workOrder);
  const base = {
    subjectType: 'WORK_ORDER' as const,
    subjectId: workOrder.id,
    subjectReference: reference,
    customerLabel: customer,
    actionLabel: 'Open Work Order',
    actionHref: `/work-orders/${workOrder.id}`,
  };

  if (type === AttentionItemType.TODAY_UNASSIGNED_WORK_ORDER) {
    return {
      ...base,
      conditionKey: `work-order:${workOrder.id}:today-unassigned`,
      type,
      priority: AttentionPriority.HIGH,
      queue: AttentionQueue.OPERATIONS,
      title: 'Today’s job is unassigned',
      summary: `${reference} · ${service} for ${customer} is scheduled today without a Technician or Crew.`,
      dueAt: workOrder.scheduledAt,
    };
  }

  if (type === AttentionItemType.OVERDUE_WORK_ORDER) {
    return {
      ...base,
      conditionKey: `work-order:${workOrder.id}:overdue`,
      type,
      priority: AttentionPriority.CRITICAL,
      queue: AttentionQueue.OPERATIONS,
      title: 'Work Order is overdue',
      summary: `${reference} · ${service} for ${customer} is past its scheduled service date and still unresolved.`,
      dueAt: workOrder.scheduledAt,
    };
  }

  if (type === AttentionItemType.WORK_ORDER_ACCESS_REQUIRED) {
    return {
      ...base,
      conditionKey: `work-order:${workOrder.id}:access-required`,
      type,
      priority: accessAttentionPriority(workOrder.scheduledAt, now),
      queue: AttentionQueue.OPERATIONS,
      title: 'Work Order access is unresolved',
      summary: `${reference} · ${service} for ${customer} requires access readiness action.`,
      dueAt: workOrder.scheduledAt,
    };
  }

  return {
    ...base,
    conditionKey: `work-order:${workOrder.id}:completion-acknowledgement`,
    type,
    priority: AttentionPriority.NORMAL,
    queue: AttentionQueue.MANAGEMENT_REVIEW,
    title: 'Completed job needs acknowledgement',
    summary: `${reference} · ${service} for ${customer} was completed by the field team and needs management acknowledgement.`,
    dueAt: null,
  };
}

@Injectable()
export class AttentionService {
  constructor(private readonly prisma: PrismaService) {}

  private async serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          attempt < 3 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2002')
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('Needs Attention transaction retry exhausted.');
  }

  private async detectCandidates(tx: Prisma.TransactionClient, now: Date): Promise<AttentionCandidate[]> {
    const { todayStart, tomorrowStart } = getJohannesburgDayBoundaries();

    const todayUnassigned = await tx.workOrder.findMany({
      where: {
        status: { in: UNRESOLVED_WORK_ORDER_STATUSES },
        scheduledAt: { gte: todayStart, lt: tomorrowStart },
        crewId: null,
        assignedTechnicians: { none: {} },
      },
      select: workOrderAttentionSelect,
    });

    const overdue = await tx.workOrder.findMany({
      where: {
        status: { in: UNRESOLVED_WORK_ORDER_STATUSES },
        scheduledAt: { lt: todayStart },
      },
      select: workOrderAttentionSelect,
    });

    const completionAcknowledgements = await tx.workOrder.findMany({
      where: {
        status: WorkOrderStatus.COMPLETED,
        completionAcceptedAt: { not: null },
        completionAcknowledgedAt: null,
      },
      select: workOrderAttentionSelect,
    });

    const unresolvedAccess = await tx.workOrder.findMany({
      where: {
        status: { in: UNRESOLVED_WORK_ORDER_STATUSES },
        accessReadiness: { notIn: [WorkOrderAccessReadiness.NOT_REQUIRED, WorkOrderAccessReadiness.ARRANGED_ANOTHER_WAY] },
      },
      select: workOrderAttentionSelect,
    });

    const unresolvedIncidents = await tx.workOrderIncident.findMany({
      where: { status: { not: 'RESOLVED' } },
      select: { id:true, category:true, fieldReportedAt:true, workOrder:{select:workOrderAttentionSelect} },
    });

    return [
      ...todayUnassigned.map((item) =>
        candidateFor(item, AttentionItemType.TODAY_UNASSIGNED_WORK_ORDER, now),
      ),
      ...overdue.map((item) =>
        candidateFor(item, AttentionItemType.OVERDUE_WORK_ORDER, now),
      ),
      ...completionAcknowledgements.map((item) =>
        candidateFor(item, AttentionItemType.COMPLETION_ACKNOWLEDGEMENT_REQUIRED, now),
      ),
      ...unresolvedAccess
        .filter((item) => !isAccessOperationallyResolved(item.accessReadiness, item.temporaryAccessCredentials, now))
        .map((item) => candidateFor(item, AttentionItemType.WORK_ORDER_ACCESS_REQUIRED, now)),
      ...unresolvedIncidents.map(({id,category,fieldReportedAt,workOrder}) => ({
        conditionKey:`work-order-incident:${id}:review`, type:AttentionItemType.WORK_ORDER_INCIDENT_REVIEW_REQUIRED,
        priority:category==='SAFETY_CRITICAL_STOP'?AttentionPriority.CRITICAL:AttentionPriority.HIGH,
        queue:AttentionQueue.MANAGEMENT_REVIEW, subjectType:'WORK_ORDER' as const, subjectId:workOrder.id,
        subjectReference:displayReference(workOrder), customerLabel:customerLabel(workOrder),
        title:category==='SAFETY_CRITICAL_STOP'?'Safety-critical incident needs review':'Field incident needs review',
        summary:`${displayReference(workOrder)} · ${category.replaceAll('_',' ').toLowerCase()} reported by the field team.`,
        actionLabel:'Review incident', actionHref:`/work-orders/${workOrder.id}#incidents`, dueAt:fieldReportedAt,
      })),
    ];
  }

  private async reconcile(): Promise<void> {
    await this.serializable(async (tx) => {
      const now = new Date();
      const candidates = await this.detectCandidates(tx, now);
      const activeKeys = new Set(candidates.map((candidate) => candidate.conditionKey));

      for (const candidate of candidates) {
        const existing = await tx.attentionItem.findUnique({
          where: { conditionKey: candidate.conditionKey },
        });

        if (!existing) {
          await tx.attentionItem.create({
            data: {
              ...candidate,
              openedAt: now,
              lastObservedAt: now,
              activities: {
                create: { type: AttentionActivityType.OPENED },
              },
            },
          });
          continue;
        }

        if (existing.state === AttentionState.RESOLVED) {
          await tx.attentionItem.update({
            where: { id: existing.id },
            data: {
              ...candidate,
              state: AttentionState.OPEN,
              ownerId: null,
              seenAt: null,
              seenById: null,
              resolvedAt: null,
              openedAt: now,
              lastObservedAt: now,
              occurrenceCount: { increment: 1 },
              activities: {
                create: { type: AttentionActivityType.REOPENED },
              },
            },
          });
          continue;
        }

        await tx.attentionItem.update({
          where: { id: existing.id },
          data: {
            ...candidate,
            lastObservedAt: now,
            ...(existing.priority !== candidate.priority ? {
              activities: {
                create: {
                  type: AttentionActivityType.PRIORITY_CHANGED,
                  metadata: {
                    previousPriority: existing.priority,
                    newPriority: candidate.priority,
                    scheduledAt: candidate.dueAt?.toISOString() ?? null,
                  },
                },
              },
            } : {}),
          },
        });
      }

      const currentlyOpen = await tx.attentionItem.findMany({
        where: {
          state: AttentionState.OPEN,
          type: { in: MANAGED_ATTENTION_TYPES },
        },
      });

      for (const item of currentlyOpen) {
        if (activeKeys.has(item.conditionKey)) continue;
        await tx.attentionItem.update({
          where: { id: item.id },
          data: {
            state: AttentionState.RESOLVED,
            resolvedAt: now,
            lastObservedAt: now,
            activities: {
              create: { type: AttentionActivityType.AUTO_RESOLVED },
            },
          },
        });
      }

      const ownedOpenItems = await tx.attentionItem.findMany({
        where: { state: AttentionState.OPEN, ownerId: { not: null } },
        select: { id: true, ownerId: true, queue: true },
      });
      const ownerIds = [...new Set(ownedOpenItems.flatMap((item) => item.ownerId ? [item.ownerId] : []))];
      const owners = ownerIds.length
        ? await tx.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, role: true, status: true },
          })
        : [];
      const ownersById = new Map(owners.map((owner) => [owner.id, owner]));

      for (const item of ownedOpenItems) {
        if (!item.ownerId) continue;
        const owner = ownersById.get(item.ownerId);
        if (
          owner &&
          owner.status === UserStatus.ACTIVE &&
          canOwnAttentionQueue(owner.role, item.queue)
        ) {
          continue;
        }
        await tx.attentionItem.update({
          where: { id: item.id },
          data: {
            ownerId: null,
            activities: {
              create: {
                type: AttentionActivityType.REASSIGNED,
                metadata: {
                  previousOwnerId: item.ownerId,
                  newOwnerId: null,
                  reason: 'OWNER_NO_LONGER_ELIGIBLE',
                },
              },
            },
          },
        });
      }
    });
  }

  private ensureVisible(user: User, item: Pick<AttentionItem, 'queue'>): void {
    if (!eligibleQueuesForRole(user.role).includes(item.queue)) {
      throw new NotFoundException('Attention item not found.');
    }
  }

  async list(user: User, requestedView?: string) {
    await this.reconcile();
    const view = requestedView === 'all' ? 'all' : 'mine';
    const queues = eligibleQueuesForRole(user.role);
    if (!queues.length) return { view, items: [], eligibleOwners: [] };

    const mineFilter: Prisma.AttentionItemWhereInput = {
      OR: [
        { ownerId: user.id },
        { ownerId: null },
        ...(user.role === UserRole.ADMIN
          ? [{ priority: AttentionPriority.CRITICAL }]
          : []),
      ],
    };

    const items = await this.prisma.attentionItem.findMany({
      where: {
        state: AttentionState.OPEN,
        queue: { in: queues },
        ...(view === 'mine' ? mineFilter : {}),
      },
    });
    items.sort(compareAttentionItems);

    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        role: { in: ATTENTION_ROLES },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const eligibleOwners = users
      .map((owner) => ({
        ...owner,
        eligibleQueues: eligibleQueuesForRole(owner.role),
      }))
      .filter((owner) => owner.eligibleQueues.some((queue) => queues.includes(queue)));

    return { view, items, eligibleOwners };
  }

  async markSeen(id: string, user: User) {
    const item = await this.prisma.attentionItem.findUnique({ where: { id } });
    if (!item || item.state !== AttentionState.OPEN) {
      throw new NotFoundException('Attention item not found.');
    }
    this.ensureVisible(user, item);
    if (item.seenAt) return item;

    return this.prisma.attentionItem.update({
      where: { id },
      data: {
        seenAt: new Date(),
        seenById: user.id,
        activities: {
          create: {
            type: AttentionActivityType.SEEN,
            actorId: user.id,
          },
        },
      },
    });
  }

  async assign(id: string, ownerId: string | null, user: User) {
    const item = await this.prisma.attentionItem.findUnique({ where: { id } });
    if (!item || item.state !== AttentionState.OPEN) {
      throw new NotFoundException('Attention item not found.');
    }
    this.ensureVisible(user, item);

    if (ownerId === item.ownerId) return item;

    if (ownerId && !UUID_PATTERN.test(ownerId)) {
      throw new BadRequestException('ownerId must be a valid UUID.');
    }

    if (ownerId) {
      const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
      if (
        !owner ||
        owner.status !== UserStatus.ACTIVE ||
        !canOwnAttentionQueue(owner.role, item.queue)
      ) {
        throw new BadRequestException('Selected owner is not eligible for this attention queue.');
      }
    }

    return this.prisma.attentionItem.update({
      where: { id },
      data: {
        ownerId,
        activities: {
          create: {
            type: item.ownerId
              ? AttentionActivityType.REASSIGNED
              : AttentionActivityType.ASSIGNED,
            actorId: user.id,
            metadata: {
              previousOwnerId: item.ownerId,
              newOwnerId: ownerId,
            },
          },
        },
      },
    });
  }
}
