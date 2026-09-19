"use client";

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { CommentListResponse, CommentResponse } from "@/lib/api/schemas";
import { queryKeys } from "@/lib/query/keys";
import { mutationKeys } from "@/lib/query/mutationKeys";
import type { AddCommentVariables } from "@/lib/query/mutationTypes";

/**
 * A task's full comment thread. `initialData` seeds from the task's already
 * -cached `comments` (embedded in `TaskResponse` — see the day-view schema)
 * when available, so `TaskDetailDialog` never shows a loading skeleton for a
 * task whose comments were already fetched as part of its day view.
 */
export function useComments(
  taskId: string,
  initialComments?: CommentListResponse,
): UseQueryResult<CommentListResponse> {
  return useQuery({
    queryKey: queryKeys.comments(taskId),
    queryFn: () => apiClient.getComments(taskId),
    initialData: initialComments,
    // `TaskDetailDialog` calls this hook unconditionally (rules of hooks)
    // even while no task is selected (`taskId === ""`) — skip the request
    // rather than firing `GET /api/tasks//comments`.
    enabled: taskId.length > 0,
  });
}

/**
 * Posts a comment. The `mutationFn` and optimistic `onMutate`/`onError`/
 * `onSettled` are inherited from `registerMutationDefaults.ts` (registered
 * once against `mutationKeys.addComment`) — this hook only supplies the
 * generic types so callers get a fully typed `mutate`/`mutateAsync`.
 */
export function useAddComment(): UseMutationResult<CommentResponse, Error, AddCommentVariables> {
  return useMutation<CommentResponse, Error, AddCommentVariables>({
    mutationKey: mutationKeys.addComment,
  });
}
