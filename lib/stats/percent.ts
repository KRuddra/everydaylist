import type { StatsDayEntry } from "@/lib/api/schemas";

/** Raw per-day figures from `lib/db/queries/stats.ts`'s rolling query, before percent is derived. */
export interface StatsDayRow {
  day: string;
  inPlay: number;
  completed: number;
}

/**
 * Derives `percent` for each day. Pure — no DB access, input rows are
 * already resolved. `percent` is `0` (not `NaN`) when `inPlay` is `0`.
 */
export function calculateDayEntries(rows: readonly StatsDayRow[]): StatsDayEntry[] {
  return rows.map(({ day, inPlay, completed }) => ({
    day,
    inPlay,
    completed,
    percent: inPlay === 0 ? 0 : Math.round((completed / inPlay) * 100),
  }));
}
