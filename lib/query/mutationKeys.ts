/**
 * Mutation key constants. Every one of these is registered with
 * `queryClient.setMutationDefaults` in `lib/query/registerMutationDefaults.ts`
 * so a mutation queued while offline (paused, then persisted to IndexedDB by
 * `PersistQueryClientProvider`) can be resumed after a page reload — resuming
 * a persisted mutation replays it by mutation key against the *registered*
 * `mutationFn`, since functions themselves can't be serialized.
 */
export const mutationKeys = {
  createTask: ["createTask"] as const,
  updateTask: ["updateTask"] as const,
  toggleComplete: ["toggleComplete"] as const,
  deleteTask: ["deleteTask"] as const,
  addComment: ["addComment"] as const,
  reorderTasks: ["reorderTasks"] as const,
};
