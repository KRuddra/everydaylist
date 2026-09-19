"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { DayViewResponse } from "@/lib/api/schemas";
import { queryKeys } from "@/lib/query/keys";

/**
 * The rolling day-view for `date` (`GET /api/days/[date]`) — backs both the
 * Today page (`date` = today) and the Day page (`date` = the browsed date).
 * `staleTime`/`gcTime` inherit the long-lived defaults from
 * `lib/query/queryClient.ts`, and the response is persisted to IndexedDB by
 * `PersistQueryClientProvider`, so a previously viewed date still renders
 * from cache when offline.
 */
export function useDayTasks(date: string): UseQueryResult<DayViewResponse> {
  return useQuery({
    queryKey: queryKeys.day(date),
    queryFn: () => apiClient.getDay(date),
  });
}
