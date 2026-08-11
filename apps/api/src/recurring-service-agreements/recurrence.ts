import { RecurrenceWeekday, WorkOrderFrequency } from '@prisma/client';

export const BUSINESS_TIME_ZONE = 'Africa/Johannesburg';
const weekdayNumbers: Record<RecurrenceWeekday, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};
export type RecurrenceRule = { frequency: WorkOrderFrequency; effectiveDate: Date; endDate?: Date | null; weekday?: RecurrenceWeekday | null; dayOfMonth?: number | null };
export function dateOnly(value: string | Date): Date {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Dates must use YYYY-MM-DD.');
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.valueOf()) || result.toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date.');
  return result;
}
export function johannesburgDate(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return dateOnly(parts);
}
const addDays = (date: Date, days: number) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
const daysBetween = (a: Date, b: Date) => Math.round((dateOnly(b).valueOf() - dateOnly(a).valueOf()) / 86_400_000);
function monthlyDate(year: number, month: number, requestedDay: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(requestedDay, lastDay)));
}
export function nextOccurrence(rule: RecurrenceRule, fromDate: Date): Date | null {
  const effective = dateOnly(rule.effectiveDate);
  const from = dateOnly(fromDate);
  const candidateStart = from > effective ? from : effective;
  let candidate: Date;
  if (rule.frequency === WorkOrderFrequency.CUSTOM || rule.frequency === WorkOrderFrequency.ONE_TIME) return null;
  if (rule.frequency === WorkOrderFrequency.MONTHLY) {
    if (!rule.dayOfMonth) throw new Error('Monthly recurrence requires dayOfMonth.');
    candidate = monthlyDate(candidateStart.getUTCFullYear(), candidateStart.getUTCMonth(), rule.dayOfMonth);
    if (candidate < candidateStart || candidate < effective) candidate = monthlyDate(candidateStart.getUTCFullYear(), candidateStart.getUTCMonth() + 1, rule.dayOfMonth);
  } else {
    if (!rule.weekday) throw new Error('Weekly recurrence requires weekday.');
    const weekday = weekdayNumbers[rule.weekday];
    candidate = addDays(candidateStart, (weekday - candidateStart.getUTCDay() + 7) % 7);
    if (rule.frequency === WorkOrderFrequency.EVERY_TWO_WEEKS) {
      const anchor = addDays(effective, (weekday - effective.getUTCDay() + 7) % 7);
      if (candidate < anchor) candidate = anchor;
      const remainder = daysBetween(anchor, candidate) % 14;
      if (remainder !== 0) candidate = addDays(candidate, 7);
    }
  }
  return rule.endDate && candidate > dateOnly(rule.endDate) ? null : candidate;
}
