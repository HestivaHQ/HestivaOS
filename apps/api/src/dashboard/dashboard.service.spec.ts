import { WorkOrderStatus } from '@prisma/client';
import { describe, expect, it } from '@jest/globals';
import { buildTodayStatusBreakdown, buildUpcomingWorkSummary, getJohannesburgDayBoundaries } from './dashboard.service';

describe('dashboard operational semantics', () => {
  it('uses Africa/Johannesburg calendar boundaries independently of UTC midnight', () => {
    const boundaries = getJohannesburgDayBoundaries(new Date('2026-08-09T22:30:00.000Z'));
    expect(boundaries.todayStart.toISOString()).toBe('2026-08-09T22:00:00.000Z');
    expect(boundaries.tomorrowStart.toISOString()).toBe('2026-08-10T22:00:00.000Z');
    expect(boundaries.upcomingEnd.toISOString()).toBe('2026-08-17T22:00:00.000Z');
  });

  it('builds a today-only workload without closed, cancelled, or waiting-for-parts states', () => {
    const result = buildTodayStatusBreakdown([
      { status: WorkOrderStatus.ON_SITE },
      { status: WorkOrderStatus.ON_SITE },
      { status: WorkOrderStatus.COMPLETED },
      { status: WorkOrderStatus.WAITING_FOR_PARTS },
      { status: WorkOrderStatus.CANCELLED },
    ]);
    expect(result).toEqual({ NEW: 0, ASSIGNED: 0, ACCEPTED: 0, TRAVELLING: 0, ON_SITE: 2, COMPLETED: 1 });
    expect(result).not.toHaveProperty('WAITING_FOR_PARTS');
    expect(result).not.toHaveProperty('CANCELLED');
    expect(result).not.toHaveProperty('CLOSED');
  });

  it('groups upcoming jobs by Johannesburg date and only counts fully unassigned work', () => {
    const result = buildUpcomingWorkSummary([
      { scheduledAt: new Date('2026-08-10T22:30:00.000Z'), technicianId: null, crewId: null },
      { scheduledAt: new Date('2026-08-11T08:00:00.000Z'), technicianId: 'tech', crewId: null },
      { scheduledAt: new Date('2026-08-12T08:00:00.000Z'), technicianId: null, crewId: 'crew' },
    ]);
    expect(result).toEqual([
      { date: '2026-08-11', jobCount: 2, unassignedCount: 1 },
      { date: '2026-08-12', jobCount: 1, unassignedCount: 0 },
    ]);
  });
});
