export type ShiftDateRange = { dateFrom: string; dateTo: string };

const johannesburgDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Johannesburg',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function isoDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** Returns the Johannesburg Monday-through-Sunday range containing now. */
export function defaultShiftDateRange(now: Date = new Date()): ShiftDateRange {
  const parts = Object.fromEntries(
    johannesburgDate.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month) - 1;
  const date = Number(parts.day);
  const day = new Date(Date.UTC(year, month, date)).getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return {
    dateFrom: isoDate(year, month, date + mondayOffset),
    dateTo: isoDate(year, month, date + mondayOffset + 6),
  };
}

export function shiftRangeQuery({ dateFrom, dateTo }: ShiftDateRange) {
  return `?page=1&pageSize=100&dateFrom=${encodeURIComponent(`${dateFrom}T00:00:00`)}&dateTo=${encodeURIComponent(`${dateTo}T23:59:59`)}`;
}
