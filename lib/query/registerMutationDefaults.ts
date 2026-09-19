import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { CommentListResponse } from "@/lib/api/schemas";
import {
  insertTaskIntoDayCache,
  patchTaskInDayCache,
  patchTaskInDayCaches,
  removeTaskFromDayCaches,
  reorderTasksInDayCaches,
  restoreDayCaches,
  snapshotDayCaches,
} from "@/lib/query/cacheHelpers";
import { queryKeys } from "@/lib/query/keys";
import { mutationKeys } from "@/lib/query/mutationKeys";
import type {
  AddCommentVariables,
  CreateTaskVariables,
  DeleteTaskVariables,
  ReorderTasksVariables,
  ToggleCompleteVariables,
  UpdateTaskVariables,
} from "@/lib/query/mutationTypes";
import { notifyMutationError } from "@/lib/query/notifyMutationError";
import { buildOptimisticComment, buildOptimisticTask } from "@/lib/query/optimistic";

/**
 * Registers a `mutationFn` plus optimistic `onMutate`/`onError`/`onSettled`
 * for every offline-outbox action, via `queryClient.setMutationDefaults`.
 *
 * This is what makes a mutation **resumable after a reload**:
 * `PersistQueryClientProvider` (`app/Providers.tsx`) persists paused
 * mutations to IndexedDB, but a persisted mutation only stores its
 * *variables* — functions can't be serialized. On restore, TanStack Query
 * resumes each paused mutation by looking up its registered `mutationFn`
 * under the same mutation key, which only exists if it was registered here
 * first. Call once, before any component mounts.
 *
 * Two optimistic-update strategies are used, matched to each mutation's
 * semantics — see `lib/query/cacheHelpers.ts` for the full rationale:
 * single-cache (create, toggle-complete — date-relative effects) vs.
 * cross-cache (edit, comment, delete, reorder — date-independent effects).
 */
export function registerMutationDefaults(queryClient: QueryClient): void {
  queryClient.setMutationDefaults(mutationKeys.createTask, {
    mutationFn: (variables: CreateTaskVariables) => apiClient.createTask(variables),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.day(variables.createdDate) });
      const snapshot = snapshotDayCaches(queryClient);
      insertTaskIntoDayCache(queryClient, variables.createdDate, buildOptimisticTask(variables));
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreDayCaches(queryClient, context.snapshot);
      notifyMutationError(error, "Couldn't add the task. It'll retry automatically.");
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.day(variables.createdDate) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
    },
  });

  queryClient.setMutationDefaults(mutationKeys.updateTask, {
    mutationFn: (variables: UpdateTaskVariables) => apiClient.patchTask(variables.taskId, variables.edits),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dayAll });
      const snapshot = snapshotDayCaches(queryClient);
      patchTaskInDayCaches(queryClient, variables.taskId, (task) => ({
        ...task,
        ...variables.edits,
        updatedAt: new Date().toISOString(),
      }));
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreDayCaches(queryClient, context.snapshot);
      notifyMutationError(error, "Couldn't save the change. It'll retry automatically.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dayAll });
    },
  });

  queryClient.setMutationDefaults(mutationKeys.toggleComplete, {
    mutationFn: (variables: ToggleCompleteVariables) =>
      apiClient.patchTask(variables.taskId, {
        completion:
          variables.action === "complete" ? { action: "complete", date: variables.date } : { action: "reopen" },
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.day(variables.date) });
      const snapshot = snapshotDayCaches(queryClient);
      patchTaskInDayCache(queryClient, variables.date, variables.taskId, (task) => ({
        ...task,
        completedDate: variables.action === "complete" ? variables.date : null,
        completed: variables.action === "complete",
        updatedAt: new Date().toISOString(),
      }));
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreDayCaches(queryClient, context.snapshot);
      notifyMutationError(error, "Couldn't update the task. It'll retry automatically.");
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.day(variables.date) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
    },
  });

  queryClient.setMutationDefaults(mutationKeys.addComment, {
    mutationFn: (variables: AddCommentVariables) =>
      apiClient.addComment(variables.taskId, { id: variables.id, body: variables.body }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dayAll });
      await queryClient.cancelQueries({ queryKey: queryKeys.comments(variables.taskId) });
      const snapshot = snapshotDayCaches(queryClient);
      const previousComments = queryClient.getQueryData<CommentListResponse>(
        queryKeys.comments(variables.taskId),
      );
      const optimisticComment = buildOptimisticComment(variables.taskId, variables.id, variables.body);

      patchTaskInDayCaches(queryClient, variables.taskId, (task) => ({
        ...task,
        comments: [...task.comments, optimisticComment],
      }));
      queryClient.setQueryData<CommentListResponse>(queryKeys.comments(variables.taskId), (old) => [
        ...(old ?? []),
        optimisticComment,
      ]);

      return { snapshot, previousComments, taskId: variables.taskId };
    },
    onError: (error, _variables, context) => {
      if (context) {
        restoreDayCaches(queryClient, context.snapshot);
        queryClient.setQueryData(queryKeys.comments(context.taskId), context.previousComments);
      }
      notifyMutationError(error, "Couldn't post the comment. It'll retry automatically.");
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments(variables.taskId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dayAll });
    },
  });

  queryClient.setMutationDefaults(mutationKeys.deleteTask, {
    mutationFn: (variables: DeleteTaskVariables) => apiClient.deleteTask(variables.taskId),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dayAll });
      const snapshot = snapshotDayCaches(queryClient);
      removeTaskFromDayCaches(queryClient, variables.taskId);
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      // A replayed delete (outbox retry after a first attempt that actually
      // succeeded server-side) surfaces as 404 — per docs/API_CONTRACT.md #6
      // that means "already gone", so it's treated as success: keep the
      // optimistic removal, no rollback, no error toast.
      if (error instanceof ApiError && error.code === "TASK_NOT_FOUND") {
        return;
      }
      if (context) restoreDayCaches(queryClient, context.snapshot);
      notifyMutationError(error, "Couldn't delete the task. It'll retry automatically.");
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dayAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.statsAll });
      queryClient.removeQueries({ queryKey: queryKeys.comments(variables.taskId) });
    },
  });

  queryClient.setMutationDefaults(mutationKeys.reorderTasks, {
    mutationFn: (variables: ReorderTasksVariables) => apiClient.reorderTasks(variables),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dayAll });
      const snapshot = snapshotDayCaches(queryClient);
      reorderTasksInDayCaches(queryClient, variables.category, variables.items);
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context) restoreDayCaches(queryClient, context.snapshot);
      notifyMutationError(error, "Couldn't save the new order. It'll retry automatically.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dayAll });
    },
  });
}
