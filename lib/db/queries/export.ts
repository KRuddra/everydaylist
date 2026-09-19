import type { TaskResponse } from "@/lib/api/schemas";
import type { AppDatabase } from "@/lib/db/client";

import { getAllTasks } from "./tasks";

/**
 * The full JSON backup data set for `GET /api/export`: every task (across
 * all of history, not scoped to any day) with its comments embedded —
 * sufficient to fully reconstruct application state. Delegates to
 * `getAllTasks` (defined in `tasks.ts`, alongside the other task queries)
 * rather than duplicating the query.
 */
export async function getExportTasks(db: AppDatabase): Promise<TaskResponse[]> {
  return getAllTasks(db);
}
