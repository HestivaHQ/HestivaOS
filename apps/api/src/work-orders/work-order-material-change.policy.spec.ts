import { describe, expect, it } from '@jest/globals';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';
import { assessMaterialChange, materialChangeStage, materialFieldsFromUpdate } from './work-order-material-change.policy';

describe('Work Order material change policy', () => {
  it('derives operational stage from authoritative Work Order lifecycle', () => {
    expect(materialChangeStage(WorkOrderStatus.NEW)).toBe('PENDING');
    expect(materialChangeStage(WorkOrderStatus.ASSIGNED)).toBe('FUTURE');
    expect(materialChangeStage(WorkOrderStatus.ACCEPTED)).toBe('IMMINENT');
    expect(materialChangeStage(WorkOrderStatus.TRAVELLING)).toBe('IMMINENT');
    expect(materialChangeStage(WorkOrderStatus.ON_SITE)).toBe('IN_PROGRESS');
    expect(materialChangeStage(WorkOrderStatus.WAITING_FOR_PARTS)).toBe('IN_PROGRESS');
    expect(materialChangeStage(WorkOrderStatus.COMPLETED)).toBe('HISTORICAL');
    expect(materialChangeStage(WorkOrderStatus.CLOSED)).toBe('HISTORICAL');
    expect(materialChangeStage(WorkOrderStatus.CANCELLED)).toBe('HISTORICAL');
  });

  it('classifies booking fields without treating internal description/priority edits as material', () => {
    expect(materialFieldsFromUpdate({ description: 'Internal clarification', priority: WorkOrderPriority.HIGH })).toEqual([]);
    expect(materialFieldsFromUpdate({ scheduledAt: '2026-08-20T08:00:00.000Z', serviceId: 'service-1' })).toEqual([
      'serviceId',
      'scheduledAt',
    ]);
  });

  it('allows controlled future changes and requires an override reason for imminent changes', () => {
    const future = assessMaterialChange(WorkOrderStatus.ASSIGNED, { scheduledAt: '2026-08-20T08:00:00.000Z' });
    expect(future.allowed).toBe(true);
    expect(future.overrideReasonRequired).toBe(false);
    expect(future.consequences.schedulingReview).toBe(true);

    const imminent = assessMaterialChange(WorkOrderStatus.ACCEPTED, { addOns: [{ serviceId: 'addon-1', quantity: 2 }] });
    expect(imminent.allowed).toBe(true);
    expect(imminent.overrideReasonRequired).toBe(true);
    expect(imminent.consequences.pricingReview).toBe(true);
    expect(imminent.consequences.executionScopeReview).toBe(true);
  });

  it('fails closed once execution starts and for historical Work Orders', () => {
    const inProgress = assessMaterialChange(WorkOrderStatus.ON_SITE, { serviceId: 'service-2' });
    expect(inProgress.allowed).toBe(false);
    expect(inProgress.blockedReason).toContain('in progress');

    const historical = assessMaterialChange(WorkOrderStatus.COMPLETED, { scheduledAt: '2026-08-21T08:00:00.000Z' });
    expect(historical.allowed).toBe(false);
    expect(historical.blockedReason).toContain('historical operational truth');
  });

  it('never permits completion timestamp rewriting through booking change', () => {
    const assessment = assessMaterialChange(WorkOrderStatus.ASSIGNED, { completedAt: '2026-08-18T12:00:00.000Z' });
    expect(assessment.allowed).toBe(false);
    expect(assessment.blockedReason).toContain('authoritative execution history');
  });
});
