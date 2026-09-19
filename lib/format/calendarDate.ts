import { format } from "date-fns";

/**
 * Display formatting for `YYYY-MM-DD` calendar-date strings (the wire format
 * used throughout `lib/api/schemas.ts`). Deliberately separate from
 * `lib/dates/*` (server-owned, pure day-boundary arithmetic) — this module
 * only formats a calendar date for on-screen display, in the browser's own
 * rendering, and never does timezone-aware "what day is it" math.
 *
 * Comparing two calendar-date strings (e.g. "is this task overdue?") never
 * needs a `Date` at all — plain string comparison (`a < b`) sorts identically
 * to chronological order for `YYYY-MM-DD` strings.
 */

/** Parses a `YYYY-MM-DD` string into a local-midnight `Date`, for display formatting only. */
export function parseCalendarDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Formats a local `Date` back into a `YYYY-MM-DD` string (inverse of `parseCalendarDate`) — used when a UI picker (e.g. `Calendar`) hands back a `Date`. */
export function toCalendarDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** e.g. "Thu, Sep 18" — screen headers (Today/Day). */
export function formatCalendarDateLong(date: string): string {
  return format(parseCalendarDate(date), "EEE, MMM d");
}

/** e.g. "Sep 20" — compact badges (`DueDateBadge`, `SearchResultItem`). */
export function formatCalendarDateShort(date: string): string {
  return format(parseCalendarDate(date), "MMM d");
}

/** e.g. "Sep 18, 9:04 PM" — the Stats page's "Updated {time}" stale-cache caption, from an ISO datetime. */
export function formatDateTimeShort(isoDateTime: string): string {
  return format(new Date(isoDateTime), "MMM d, h:mm a");
}
