"use client";

import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

/**
 * Live online/offline status, backed by TanStack Query's default
 * `onlineManager` (which itself listens to the browser's `online`/`offline`
 * events). Using the same manager the query/mutation pause logic reads from
 * keeps `OfflineBanner` and the outbox's actual pause/resume behavior from
 * ever disagreeing about connectivity.
 *
 * Server snapshot defaults to `true` (online) so SSR/first paint never shows
 * a false "offline" flash before hydration.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => true,
  );
}
