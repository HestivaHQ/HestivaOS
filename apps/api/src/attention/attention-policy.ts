import {
  AttentionPriority,
  AttentionQueue,
  UserRole,
} from '@prisma/client';

const OPERATIONS_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATIONS_MANAGER,
  UserRole.DISPATCHER,
  UserRole.SUPERVISOR,
];

const MANAGEMENT_REVIEW_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPERVISOR,
];

export function eligibleQueuesForRole(role: UserRole): AttentionQueue[] {
  const queues: AttentionQueue[] = [];
  if (OPERATIONS_ROLES.includes(role)) queues.push(AttentionQueue.OPERATIONS);
  if (MANAGEMENT_REVIEW_ROLES.includes(role)) queues.push(AttentionQueue.MANAGEMENT_REVIEW);
  return queues;
}

export function canOwnAttentionQueue(role: UserRole, queue: AttentionQueue): boolean {
  return eligibleQueuesForRole(role).includes(queue);
}

export function attentionPriorityRank(priority: AttentionPriority): number {
  switch (priority) {
    case AttentionPriority.CRITICAL:
      return 0;
    case AttentionPriority.HIGH:
      return 1;
    case AttentionPriority.NORMAL:
      return 2;
  }
}

export function compareAttentionItems(
  left: { priority: AttentionPriority; dueAt: Date | null; openedAt: Date },
  right: { priority: AttentionPriority; dueAt: Date | null; openedAt: Date },
): number {
  const priority = attentionPriorityRank(left.priority) - attentionPriorityRank(right.priority);
  if (priority) return priority;
  if (left.dueAt && right.dueAt) {
    const due = left.dueAt.getTime() - right.dueAt.getTime();
    if (due) return due;
  } else if (left.dueAt) {
    return -1;
  } else if (right.dueAt) {
    return 1;
  }
  return left.openedAt.getTime() - right.openedAt.getTime();
}
