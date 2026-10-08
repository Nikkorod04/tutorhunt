/**
 * Date and time helpers.
 *
 * The app operates in Asia/Manila (UTC+8). The Philippines has never observed
 * daylight saving, so a fixed offset is exact and avoids depending on Intl
 * time-zone data being present in the Hermes runtime.
 *
 * Blueprint section 41: store real timestamps, convert to local only for
 * display, and never compare a local date string against a stored Timestamp.
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

interface ManilaParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

/** Wall-clock parts in Manila for an absolute instant. */
export function manilaParts(date: Date): ManilaParts {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** "2026-10" for the Manila month containing this instant. */
export function manilaMonthKey(date: Date): string {
  const { year, month } = manilaParts(date);
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** The current Manila month key. Used for the PDF quota counter. */
export function currentManilaMonthKey(now: Date = new Date()): string {
  return manilaMonthKey(now);
}

/**
 * Half-open local-day range [start, end) as absolute instants, ready to use
 * as a Firestore range query on a Timestamp field.
 */
export function manilaDayRange(date: Date): { start: Date; end: Date } {
  const { year, month, day } = manilaParts(date);
  const startMs = Date.UTC(year, month, day, 0, 0, 0, 0) - MANILA_OFFSET_MS;
  return { start: new Date(startMs), end: new Date(startMs + MS_PER_DAY) };
}

/** Half-open local-month range [start, end) as absolute instants. */
export function manilaMonthRange(date: Date): { start: Date; end: Date } {
  const { year, month } = manilaParts(date);
  const startMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - MANILA_OFFSET_MS;
  const endMs = Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - MANILA_OFFSET_MS;
  return { start: new Date(startMs), end: new Date(endMs) };
}

/** "Oct 7, 2026" */
export function formatDisplayDate(date: Date): string {
  const { year, month, day } = manilaParts(date);
  return `${MONTHS_SHORT[month]} ${day}, ${year}`;
}

/** "4:00 PM" */
export function formatDisplayTime(date: Date): string {
  const { hours, minutes } = manilaParts(date);
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** "Oct 7, 2026 · 4:00 PM" */
export function formatDisplayDateTime(date: Date): string {
  return `${formatDisplayDate(date)} · ${formatDisplayTime(date)}`;
}

/** Age in whole years, calculated rather than stored (blueprint section 10). */
export function ageFromBirthday(birthday: Date, now: Date = new Date()): number {
  const b = manilaParts(birthday);
  const n = manilaParts(now);
  let age = n.year - b.year;
  const beforeBirthdayThisYear = n.month < b.month || (n.month === b.month && n.day < b.day);
  if (beforeBirthdayThisYear) age -= 1;
  return Math.max(0, age);
}

/** True when the date is in the future relative to `now`. */
export function isFutureDate(date: Date, now: Date = new Date()): boolean {
  return date.getTime() > now.getTime();
}

/**
 * Parses "YYYY-MM-DD" as Manila local midnight.
 * Returns null for anything malformed, including overflow such as 2026-02-31.
 */
export function parseIsoDate(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const ms = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - MANILA_OFFSET_MS;
  const parsed = new Date(ms);

  // Round-trip check rejects dates that rolled over, e.g. 31 February.
  const parts = manilaParts(parsed);
  if (parts.year !== year || parts.month !== month - 1 || parts.day !== day) return null;

  return parsed;
}

/** Formats an instant as "YYYY-MM-DD" in Manila local time. */
export function formatIsoDate(date: Date): string {
  const { year, month, day } = manilaParts(date);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Builds an absolute instant from a Manila calendar date and wall-clock time. */
export function combineManilaDateAndTime(
  date: Date,
  hours: number,
  minutes: number,
): Date {
  const parts = manilaParts(date);
  return new Date(
    Date.UTC(parts.year, parts.month, parts.day, hours, minutes, 0, 0) - MANILA_OFFSET_MS,
  );
}

/** 12-hour h:mm AM/PM in Manila, suitable for editing in a form. */
export function formatTimeInput(date: Date): string {
  return formatDisplayTime(date);
}
