import { WorkOrderAccessReadiness, WorkOrderStatus } from '@prisma/client';

const ACTIVE = new Set<WorkOrderStatus>([
  WorkOrderStatus.NEW, WorkOrderStatus.ASSIGNED, WorkOrderStatus.ACCEPTED,
  WorkOrderStatus.TRAVELLING, WorkOrderStatus.ON_SITE, WorkOrderStatus.WAITING_FOR_PARTS,
  WorkOrderStatus.INTERRUPTED,
]);
const UNRESOLVED = new Set<WorkOrderAccessReadiness>([
  WorkOrderAccessReadiness.REQUIRED_MISSING,
  WorkOrderAccessReadiness.NEEDS_REVIEW,
  WorkOrderAccessReadiness.EXPIRED,
]);

export function isAccessRecoveryFactEligible(status: WorkOrderStatus, readiness: WorkOrderAccessReadiness): boolean {
  return ACTIVE.has(status) && UNRESOLVED.has(readiness);
}
