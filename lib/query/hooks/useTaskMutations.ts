"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { TaskDeleteResponse, TaskResponse } from "@/lib/api/schemas";
import { mutationKeys } from "@/lib/query/mutationKeys";
import type {
  CreateTaskVariables,
  DeleteTaskVariables,
  ToggleCompleteVariables,
  UpdateTaskVariables,
} from "@/lib/query/mutationTypes";

/**
 * Every hook below inherits its `mutationFn` and optimistic
 * `onMutate`/`onError`/`onSettled` from `registerMutationDefaults.ts`
 * (registered once against the matching `mutationKeys.*` entry) — each hook
 * only supplies generic types so call sites get a fully typed
 * `mutate`/`mutateAsync`/`isPending`. This is what makes a mutation started
 * while offline resumable after a reload: TanStack Query looks up the
 * registered default by mutation key when replaying a persisted mutation.
 */

export function useCreateTask(): UseMutationResult<TaskResponse, Error, CreateTaskVariables> {
  return useMutation<TaskResponse, Error, CreateTaskVariables>({
    mutationKey: mutationKeys.createTask,
  });
}

export function useUpdateTask(): UseMutationResult<TaskResponse, Error, UpdateTaskVariables> {
  return useMutation<TaskResponse, Error, UpdateTaskVariables>({
    mutationKey: mutationKeys.updateTask,
  });
}

export function useToggleComplete(): UseMutationResult<TaskResponse, Error, ToggleCompleteVariables> {
  return useMutation<TaskResponse, Error, ToggleCompleteVariables>({
    mutationKey: mutationKeys.toggleComplete,
  });
}

export function useDeleteTask(): UseMutationResult<TaskDeleteResponse, Error, DeleteTaskVariables> {
  return useMutation<TaskDeleteResponse, Error, DeleteTaskVariables>({
    mutationKey: mutationKeys.deleteTask,
  });
}
