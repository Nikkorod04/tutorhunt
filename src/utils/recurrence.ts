import { combineManilaDateAndTime, formatIsoDate, manilaParts } from './date';

export const MAX_RECURRING_SESSIONS = 100;
export const MAX_RECURRING_MONTHS = 6;

export function addCalendarMonths(date: Date, months: number): Date {
  const parts = manilaParts(date);
  const targetMonth = parts.month + months;
  const lastDay = new Date(Date.UTC(parts.year, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(parts.day, lastDay);
  const target = new Date(Date.UTC(parts.year, targetMonth, day) - 8 * 60 * 60 * 1000);
  return combineManilaDateAndTime(target, 0, 0);
}

export function dateOnlyKey(date: Date): string {
  return formatIsoDate(date);
}

export function generateRecurringDates(
  startDate: Date,
  endDate: Date,
  weekdays: number[],
  skipDates: Date[] = [],
): Date[] {
  const allowed = new Set(weekdays);
  const skipped = new Set(skipDates.map(dateOnlyKey));
  const result: Date[] = [];
  for (
    let cursor = new Date(startDate.getTime());
    cursor.getTime() <= endDate.getTime();
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const weekday = new Date(cursor.getTime() + 8 * 60 * 60 * 1000).getUTCDay();
    if (allowed.has(weekday) && !skipped.has(dateOnlyKey(cursor))) result.push(cursor);
  }
  return result;
}

export function weekdayLabel(weekday: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekday] ?? 'Day';
}
