import type { CategorySlug } from "@/lib/config/categories";
import type { TaskEditFields, TaskPriority, TaskReorderRequest } from "@/lib/api/schemas";

/**
 * Variable shapes for the offline-outbox mutations registered in
 * `lib/query/registerMutationDefaults.ts`. Kept separate from
 * `lib/api/schemas.ts` because these describe what a *caller* passes to a
 * mutation hook, which isn't always identical to a request body (e.g.
 * `createdDate` is optional on the wire but always explicit here — see
 * `CreateTaskVariables`).
 */

export interface CreateTaskVariables {
  id: string;
  category: CategorySlug;
  title: string;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  /**
   * Always supplied by the caller (never left to the server's "defaults to
   * today" behavior) so the optimistic insert always knows which single
   * cached day-view to target — see `cacheHelpers.insertTaskIntoDayCache`.
   */
  createdDate: string;
}

export interface UpdateTaskVariables {
  taskId: string;
  edits: TaskEditFields;
}

export interface ToggleCompleteVariables {
  taskId: string;
  /**
   * The date being viewed when the checkbox was toggled. Completion is
   * always relative to this date, never "today" — see
   * `docs/API_CONTRACT.md`'s Completion Representation section.
   */
  date: string;
  action: "complete" | "reopen";
}

export interface DeleteTaskVariables {
  taskId: string;
}

export interface AddCommentVariables {
  taskId: string;
  id: string;
  body: string;
}

export type ReorderTasksVariables = TaskReorderRequest;
