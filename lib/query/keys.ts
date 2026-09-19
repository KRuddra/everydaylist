/**
 * Query key factories — kept in one place so cache reads/writes/invalidations
 * everywhere else (`lib/query/hooks/*`, `lib/query/cacheHelpers.ts`,
 * `lib/query/registerMutationDefaults.ts`) never hand-roll a key and risk a
 * typo-driven cache miss.
 */
export const queryKeys = {
  /** Rolling day-view for a single date (`GET /api/days/[date]`). */
  day: (date: string) => ["day", date] as const,
  /** Prefix matching every cached day-view query, any date. */
  dayAll: ["day"] as const,
  /** A task's full comment thread (`GET /api/tasks/[id]/comments`). */
  comments: (taskId: string) => ["comments", taskId] as const,
  /** Stats + heatmap range (`GET /api/stats`). */
  stats: (from: string, to: string) => ["stats", from, to] as const,
  /** Prefix matching every cached stats query, any range. */
  statsAll: ["stats"] as const,
  /** Search results for a query string (`GET /api/search`). */
  search: (q: string) => ["search", q] as const,
};
