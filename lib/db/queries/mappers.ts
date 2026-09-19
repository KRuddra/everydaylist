import type { CommentResponse, TaskPriority, TaskResponse } from "@/lib/api/schemas";
import type { CategorySlug } from "@/lib/config/categories";
import type { TaskCommentRow, TaskRow } from "@/lib/db/schema";

/**
 * Maps a `tasks` row (+ its already-fetched comments) to the API's
 * `taskResponseSchema` shape.
 *
 * `completed` has two meanings depending on context (see
 * `docs/API_CONTRACT.md`'s "Endpoint Details" #3 and the `dueDate`/`completed`
 * field notes):
 * - Day-view (`GET /api/days/[date]`): pass `relativeToDate` — `completed` is
 *   `true` iff `completedDate === relativeToDate`, NOT whether the task has
 *   ever been completed. A task completed on some other day is still "open"
 *   as of `relativeToDate`.
 * - Everywhere else (create/patch/comments/search/export — a standalone task,
 *   not a day view): omit `relativeToDate` — `completed` is the absolute
 *   `completedDate !== null`.
 */
export function mapTaskRow(
  row: TaskRow,
  comments: CommentResponse[],
  options?: { relativeToDate?: string },
): TaskResponse {
  const completed = options?.relativeToDate
    ? row.completedDate === options.relativeToDate
    : row.completedDate !== null;

  return {
    id: row.id,
    category: row.category as CategorySlug,
    title: row.title,
    priority: row.priority as TaskPriority | null,
    dueDate: row.dueDate,
    createdDate: row.createdDate,
    completedDate: row.completedDate,
    completed,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    comments,
  };
}

/** Maps a `task_comments` row to the API's `commentResponseSchema` shape. */
export function mapCommentRow(row: TaskCommentRow): CommentResponse {
  return {
    id: row.id,
    taskId: row.taskId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}
