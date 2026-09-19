import { formatInTimeZone } from "date-fns-tz";

/**
 * The current calendar date (`YYYY-MM-DD`) in `timeZone`. Pure given its
 * arguments: `now` defaults to the real current instant but is injectable
 * (tests, and any caller that needs a fixed "now"). Server callers pass
 * `env.APP_TIMEZONE`; never compute "today" with the server process's local
 * timezone directly.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd");
}
