import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { CATEGORY_SLUGS } from "@/lib/config/categories";
import { queryKeys } from "@/lib/query/keys";
import type { DayViewResponse, TaskResponse } from "@/lib/api/schemas";

/**
 * Cache-manipulation helpers shared by every optimistic mutation in
 * `lib/query/registerMutationDefaults.ts`. Kept pure/synchronous and free of
 * network or toast concerns so each mutation's `onMutate`/`onError` reads as
 * "snapshot, patch, (maybe) restore" without repeating cache plumbing.
 *
 * Two update strategies are used, matched to the mutation's semantics:
 * - **Single-cache** (`insertTaskIntoDayCache`, one date passed explicitly):
 *   for changes whose effect is date-relative — creating a task (targets one
 *   `createdDate`) and toggling completion (`completed`/`completedDate` are
 *   only meaningful *relative to the viewed date*, per
 *   `docs/API_CONTRACT.md` #3).
 * - **Cross-cache** (`patchTaskInDayCaches`/`removeTaskFromDayCaches`, every
 *   cached day matching a task id): for changes whose effect is
 *   date-independent — field edits, comments, delete, reorder. The same task
 *   can be visible in more than one cached day (e.g. Today and a previously
 *   browsed past day), and these changes should apply everywhere it appears.
 */

type DaySnapshot = Array<[QueryKey, DayViewResponse | undefined]>;

/** Snapshots every currently cached day-view query, for rollback on error. */
export function snapshotDayCaches(queryClient: QueryClient): DaySnapshot {
  return queryClient.getQueriesData<DayViewResponse>({ queryKey: queryKeys.dayAll });
}

/** Restores a snapshot taken by `snapshotDayCaches` (used from `onError`). */
export function restoreDayCaches(queryClient: QueryClient, snapshot: DaySnapshot): void {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

/** Inserts `task` into the single day cache for `date`, if that cache is loaded. */
export function insertTaskIntoDayCache(queryClient: QueryClient, date: string, task: TaskResponse): void {
  queryClient.setQueryData<DayViewResponse>(queryKeys.day(date), (old) => {
    if (!old) return old;
    if (old.tasks.some((existing) => existing.id === task.id)) return old; // idempotent replay guard
    return { ...old, tasks: [...old.tasks, task] };
  });
}

/** Applies `updater` to a task with `taskId` in the single day cache for `date`. */
export function patchTaskInDayCache(
  queryClient: QueryClient,
  date: string,
  taskId: string,
  updater: (task: TaskResponse) => TaskResponse,
): void {
  queryClient.setQueryData<DayViewResponse>(queryKeys.day(date), (old) => {
    if (!old) return old;
    let changed = false;
    const tasks = old.tasks.map((task) => {
      if (task.id !== taskId) return task;
      changed = true;
      return updater(task);
    });
    return changed ? { ...old, tasks } : old;
  });
}

/** Applies `updater` to a task with `taskId` in every currently cached day-view query. */
export function patchTaskInDayCaches(
  queryClient: QueryClient,
  taskId: string,
  updater: (task: TaskResponse) => TaskResponse,
): void {
  queryClient.setQueriesData<DayViewResponse>({ queryKey: queryKeys.dayAll }, (old) => {
    if (!old) return old;
    let changed = false;
    const tasks = old.tasks.map((task) => {
      if (task.id !== taskId) return task;
      changed = true;
      return updater(task);
    });
    return changed ? { ...old, tasks } : old;
  });
}

/** Removes a task with `taskId` from every currently cached day-view query. */
export function removeTaskFromDayCaches(queryClient: QueryClient, taskId: string): void {
  queryClient.setQueriesData<DayViewResponse>({ queryKey: queryKeys.dayAll }, (old) => {
    if (!old) return old;
    if (!old.tasks.some((task) => task.id === taskId)) return old;
    return { ...old, tasks: old.tasks.filter((task) => task.id !== taskId) };
  });
}

/**
 * Applies a reorder's new `sortOrder` values (scoped to one `category`) to
 * every currently cached day-view query, then re-sorts each affected
 * response's flat `tasks` array by (category order, `sortOrder`) — mirroring
 * the server's own sort contract (`docs/API_CONTRACT.md` #3) — so the
 * optimistic order matches what a refetch will return.
 */
export function reorderTasksInDayCaches(
  queryClient: QueryClient,
  category: string,
  items: Array<{ id: string; sortOrder: number }>,
): void {
  const sortOrderById = new Map(items.map((item) => [item.id, item.sortOrder]));
  const categoryIndex = new Map(CATEGORY_SLUGS.map((slug, index) => [slug, index]));

  queryClient.setQueriesData<DayViewResponse>({ queryKey: queryKeys.dayAll }, (old) => {
    if (!old) return old;
    if (!old.tasks.some((task) => task.category === category && sortOrderById.has(task.id))) {
      return old;
    }
    const tasks = old.tasks
      .map((task) => {
        const nextSortOrder = sortOrderById.get(task.id);
        return nextSortOrder === undefined ? task : { ...task, sortOrder: nextSortOrder };
      })
      .sort((a, b) => {
        const categoryDelta = (categoryIndex.get(a.category) ?? 0) - (categoryIndex.get(b.category) ?? 0);
        return categoryDelta !== 0 ? categoryDelta : a.sortOrder - b.sortOrder;
      });
    return { ...old, tasks };
  });
}
