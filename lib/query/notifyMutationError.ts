import { toast } from "sonner";

import { ApiError } from "@/lib/api/errors";

/**
 * Surfaces a genuine mutation failure (not an offline pause — TanStack Query
 * never calls `onError` for a paused-while-offline mutation, only for one
 * that actually ran and failed) as a `sonner` toast, preferring the server's
 * human-readable `message` when available.
 */
export function notifyMutationError(error: unknown, fallbackMessage: string): void {
  const message = error instanceof ApiError ? error.message : fallbackMessage;
  toast.error(message);
}
