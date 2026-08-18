import { describe, expect, it } from '@jest/globals';
import {
  AttentionPriority,
  AttentionQueue,
  UserRole,
} from '@prisma/client';
import {
  canOwnAttentionQueue,
  compareAttentionItems,
  eligibleQueuesForRole,
} from './attention-policy';

describe('Needs Attention policy', () => {
  it('keeps operations and management-review ownership permission-aware', () => {
    expect(eligibleQueuesForRole(UserRole.ADMIN)).toEqual([
      AttentionQueue.OPERATIONS,
      AttentionQueue.MANAGEMENT_REVIEW,
    ]);
    expect(eligibleQueuesForRole(UserRole.SUPERVISOR)).toEqual([
      AttentionQueue.OPERATIONS,
      AttentionQueue.MANAGEMENT_REVIEW,
    ]);
    expect(eligibleQueuesForRole(UserRole.DISPATCHER)).toEqual([
      AttentionQueue.OPERATIONS,
    ]);
    expect(eligibleQueuesForRole(UserRole.TECHNICIAN)).toEqual([]);
    expect(
      canOwnAttentionQueue(UserRole.DISPATCHER, AttentionQueue.MANAGEMENT_REVIEW),
    ).toBe(false);
  });

  it('sorts deterministically by consequence, deadline, then occurrence age', () => {
    const base = new Date('2026-08-18T06:00:00.000Z');
    const items = [
      { priority: AttentionPriority.NORMAL, dueAt: null, openedAt: base },
      { priority: AttentionPriority.HIGH, dueAt: new Date('2026-08-18T09:00:00.000Z'), openedAt: base },
      { priority: AttentionPriority.CRITICAL, dueAt: new Date('2026-08-17T08:00:00.000Z'), openedAt: base },
      { priority: AttentionPriority.HIGH, dueAt: new Date('2026-08-18T08:00:00.000Z'), openedAt: base },
    ];
    items.sort(compareAttentionItems);
    expect(items.map((item) => item.priority)).toEqual([
      AttentionPriority.CRITICAL,
      AttentionPriority.HIGH,
      AttentionPriority.HIGH,
      AttentionPriority.NORMAL,
    ]);
    expect(items[1].dueAt?.toISOString()).toBe('2026-08-18T08:00:00.000Z');
  });
});
