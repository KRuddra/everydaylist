import type { StatsResponse } from "@/lib/api/schemas";

import { calculateDayEntries, type StatsDayRow } from "./percent";
import { calculateCurrentStreak, calculateLongestStreak } from "./streaks";

/**
 * Combines the range-scoped `days` figures with the whole-history streak
 * summary into the `statsResponseSchema` shape. Pure — every input is
 * already-queried data; see `lib/db/queries/stats.ts` for where it comes
 * from. `currentStreak`/`longestStreak` are computed over `completionDays`
 * (the *entire* task history), not `dayRows` (bounded to the query range) —
 * see `docs/API_CONTRACT.md`'s `/api/stats` section.
 */
export function buildStatsResponse(
  dayRows: readonly StatsDayRow[],
  completionDays: ReadonlySet<string>,
  today: string,
): StatsResponse {
  return {
    days: calculateDayEntries(dayRows),
    currentStreak: calculateCurrentStreak(completionDays, today),
    longestStreak: calculateLongestStreak(completionDays),
  };
}
