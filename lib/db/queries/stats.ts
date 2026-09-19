import { isNotNull, sql } from "drizzle-orm";

import type { AppDatabase } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import type { StatsDayRow } from "@/lib/stats/percent";

/**
 * Per-day `inPlay`/`completed` counts for every calendar day in
 * `[from, to]`, via a single `generate_series` + `LEFT JOIN` query.
 *
 * `inPlay` counts every task matching the same rolling predicate as the
 * day-view (`createdDate <= day AND (completedDate IS NULL OR completedDate
 * >= day)`); `completed` further filters those to `completedDate = day`.
 * Completing a task always satisfies the rolling predicate for that day
 * too (the schema's CHECK constraint guarantees `completedDate >=
 * createdDate`), so `completed` is always `<= inPlay` for the same day and a
 * single join suffices for both counts.
 */
export async function getStatsDayRows(db: AppDatabase, from: string, to: string): Promise<StatsDayRow[]> {
  // `generate_series` over date bounds with an interval step actually
  // returns `timestamp` (there is no date-returning overload), so the inner
  // subquery casts back to `date` — otherwise every comparison/text-cast
  // below would carry a spurious time-of-day/timezone component.
  const result = await db.execute<{ day: string; in_play: number; completed: number }>(sql`
    SELECT
      gs.day::text AS day,
      COUNT(t.id)::int AS in_play,
      COUNT(t.id) FILTER (WHERE t.completed_date = gs.day)::int AS completed
    FROM (
      SELECT generate_series(${from}::date, ${to}::date, interval '1 day')::date AS day
    ) AS gs
    LEFT JOIN ${tasks} AS t
      ON t.created_date <= gs.day
      AND (t.completed_date IS NULL OR t.completed_date >= gs.day)
    GROUP BY gs.day
    ORDER BY gs.day
  `);

  return result.rows.map((row) => ({
    day: row.day,
    inPlay: row.in_play,
    completed: row.completed,
  }));
}

/**
 * Every calendar day (across the *entire* task history, not bounded to any
 * range) with at least one completion — the input `lib/stats/streaks.ts`
 * needs, since `currentStreak`/`longestStreak` aren't bounded by the `from`/
 * `to` query range (see docs/API_CONTRACT.md's `/api/stats` section).
 */
export async function getCompletionDays(db: AppDatabase): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ day: tasks.completedDate })
    .from(tasks)
    .where(isNotNull(tasks.completedDate));

  return new Set(rows.map((row) => row.day).filter((day): day is string => day !== null));
}
