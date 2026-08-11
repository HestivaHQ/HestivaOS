import { describe, expect, test } from '@jest/globals';
import { RecurrenceWeekday, WorkOrderFrequency } from '@prisma/client';
import { johannesburgDate, nextOccurrence } from './recurrence';
const d = (value: string) => new Date(`${value}T00:00:00Z`);
describe('recurrence calculation', () => {
  test('weekly uses the requested weekday and effective boundary', () => expect(nextOccurrence({ frequency: WorkOrderFrequency.WEEKLY, effectiveDate: d('2026-08-11'), weekday: RecurrenceWeekday.FRIDAY }, d('2026-08-11'))?.toISOString().slice(0,10)).toBe('2026-08-14'));
  test('biweekly stays anchored across calendar years', () => expect(nextOccurrence({ frequency: WorkOrderFrequency.EVERY_TWO_WEEKS, effectiveDate: d('2025-12-26'), weekday: RecurrenceWeekday.FRIDAY }, d('2026-01-02'))?.toISOString().slice(0,10)).toBe('2026-01-09'));
  test('monthly clamps the 31st to the final valid day', () => expect(nextOccurrence({ frequency: WorkOrderFrequency.MONTHLY, effectiveDate: d('2026-01-01'), dayOfMonth: 31 }, d('2026-02-01'))?.toISOString().slice(0,10)).toBe('2026-02-28'));
  test('monthly handles leap-year February', () => expect(nextOccurrence({ frequency: WorkOrderFrequency.MONTHLY, effectiveDate: d('2028-01-01'), dayOfMonth: 31 }, d('2028-02-01'))?.toISOString().slice(0,10)).toBe('2028-02-29'));
  test('honours an inclusive end date and rejects later dates', () => { const rule = { frequency: WorkOrderFrequency.WEEKLY, effectiveDate: d('2026-08-01'), endDate: d('2026-08-14'), weekday: RecurrenceWeekday.FRIDAY }; expect(nextOccurrence(rule, d('2026-08-14'))?.toISOString().slice(0,10)).toBe('2026-08-14'); expect(nextOccurrence(rule, d('2026-08-15'))).toBeNull(); });
  test('uses Johannesburg local date across the UTC boundary', () => expect(johannesburgDate(new Date('2026-08-10T22:30:00Z')).toISOString().slice(0,10)).toBe('2026-08-11'));
  test('custom recurrence is manual', () => expect(nextOccurrence({ frequency: WorkOrderFrequency.CUSTOM, effectiveDate: d('2026-08-11') }, d('2026-08-11'))).toBeNull());
});
