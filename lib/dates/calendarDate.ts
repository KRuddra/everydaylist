/**
 * Pure calendar-date (`YYYY-MM-DD`) arithmetic, used by `lib/stats` to walk
 * streaks day-by-day. These operate on already-resolved calendar date
 * strings (not instants), so the arithmetic is done in UTC purely to avoid
 * DST shifting the day-of-month — it is NOT a timezone conversion (compare
 * `lib/dates/today.ts`, which is the one place "now" gets resolved to a
 * calendar date via `APP_TIMEZONE`).
 */

/** Adds `delta` days (negative to subtract) to a `YYYY-MM-DD` string, returning a `YYYY-MM-DD` string. */
export function addDaysToCalendarDate(date: string, delta: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return shifted.toISOString().slice(0, 10);
}
