import { addDaysToCalendarDate } from "@/lib/dates/calendarDate";

/**
 * Current streak: the number of consecutive calendar days, walking backward
 * from `today`, that each have at least one completion. `0` if `today`
 * itself has no completion (a streak "in progress" requires today to count).
 */
export function calculateCurrentStreak(completionDays: ReadonlySet<string>, today: string): number {
  let streak = 0;
  let cursor = today;
  while (completionDays.has(cursor)) {
    streak += 1;
    cursor = addDaysToCalendarDate(cursor, -1);
  }
  return streak;
}

/**
 * Longest streak across the entire history of completion days: the length
 * of the longest run of chronologically consecutive calendar dates present
 * in `completionDays`.
 */
export function calculateLongestStreak(completionDays: ReadonlySet<string>): number {
  let longest = 0;

  for (const day of completionDays) {
    const previousDay = addDaysToCalendarDate(day, -1);
    if (completionDays.has(previousDay)) {
      // Not the start of a run — it'll be counted from its own run's start.
      continue;
    }

    let runLength = 1;
    let cursor = day;
    while (completionDays.has(addDaysToCalendarDate(cursor, 1))) {
      cursor = addDaysToCalendarDate(cursor, 1);
      runLength += 1;
    }
    longest = Math.max(longest, runLength);
  }

  return longest;
}
