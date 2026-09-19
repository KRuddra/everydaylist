import { clientEnv } from "@/lib/config/clientEnv";
import { todayInTimeZone } from "@/lib/dates/today";
import type { CommentResponse, TaskCreateRequest, TaskResponse } from "@/lib/api/schemas";

/** "Today" per the app's fixed timezone, resolved client-side for optimistic writes. */
export function clientToday(): string {
  return todayInTimeZone(clientEnv.NEXT_PUBLIC_APP_TIMEZONE);
}

/**
 * Builds a full `TaskResponse`-shaped object for an optimistic insert before
 * the server has responded. `sortOrder` uses `Number.MAX_SAFE_INTEGER` so it
 * always sorts after every real task in its category (the server appends new
 * tasks to the end, too) — see `reorderTasksInDayCaches` for the general
 * sort contract this needs to stay consistent with.
 */
export function buildOptimisticTask(input: TaskCreateRequest & { createdDate: string }): TaskResponse {
  const now = new Date().toISOString();
  return {
    id: input.id,
    category: input.category,
    title: input.title,
    priority: input.priority ?? null,
    dueDate: input.dueDate ?? null,
    createdDate: input.createdDate,
    completedDate: null,
    completed: false,
    sortOrder: Number.MAX_SAFE_INTEGER,
    createdAt: now,
    updatedAt: now,
    comments: [],
  };
}

/** Builds a full `CommentResponse`-shaped object for an optimistic insert. */
export function buildOptimisticComment(taskId: string, id: string, body: string): CommentResponse {
  return {
    id,
    taskId,
    body,
    createdAt: new Date().toISOString(),
  };
}
