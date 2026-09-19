"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { TaskReorderResponse } from "@/lib/api/schemas";
import { mutationKeys } from "@/lib/query/mutationKeys";
import type { ReorderTasksVariables } from "@/lib/query/mutationTypes";

/**
 * Persists a new within-category task order. Wired end-to-end (optimistic
 * update + offline resumability, see `registerMutationDefaults.ts`) but not
 * yet driven by a drag UI — `TaskItem`'s drag handle is deferred per
 * `docs/UI_SPEC.md` §2.1's own note that reorder timing needs confirmation.
 * Kept as a ready-to-call hook so wiring a drag interaction later is a
 * UI-only change.
 */
export function useReorderTasks(): UseMutationResult<TaskReorderResponse, Error, ReorderTasksVariables> {
  return useMutation<TaskReorderResponse, Error, ReorderTasksVariables>({
    mutationKey: mutationKeys.reorderTasks,
  });
}
