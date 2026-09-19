"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { StatsResponse } from "@/lib/api/schemas";
import { queryKeys } from "@/lib/query/keys";

/** Daily completion % + streak summary for `[from, to]` (`GET /api/stats`). */
export function useStats(from: string, to: string): UseQueryResult<StatsResponse> {
  return useQuery({
    queryKey: queryKeys.stats(from, to),
    queryFn: () => apiClient.getStats(from, to),
  });
}
