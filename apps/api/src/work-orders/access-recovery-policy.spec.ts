import { describe, expect, it } from '@jest/globals';
import { WorkOrderAccessReadiness, WorkOrderStatus } from '@prisma/client';
import { isAccessRecoveryFactEligible } from './access-recovery-policy';

describe('Phase 3D access recovery eligibility', () => {
  it.each([WorkOrderAccessReadiness.REQUIRED_MISSING, WorkOrderAccessReadiness.NEEDS_REVIEW, WorkOrderAccessReadiness.EXPIRED])('allows active unresolved access state %s', readiness => {
    expect(isAccessRecoveryFactEligible(WorkOrderStatus.ASSIGNED, readiness)).toBe(true);
  });
  it.each([WorkOrderAccessReadiness.RECEIVED, WorkOrderAccessReadiness.ARRANGED_ANOTHER_WAY, WorkOrderAccessReadiness.NOT_REQUIRED])('excludes resolved access state %s', readiness => {
    expect(isAccessRecoveryFactEligible(WorkOrderStatus.ASSIGNED, readiness)).toBe(false);
  });
  it.each([WorkOrderStatus.COMPLETED, WorkOrderStatus.CLOSED, WorkOrderStatus.CANCELLED])('excludes inactive lifecycle %s', status => {
    expect(isAccessRecoveryFactEligible(status, WorkOrderAccessReadiness.REQUIRED_MISSING)).toBe(false);
  });
});
