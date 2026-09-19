"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { SearchResponse } from "@/lib/api/schemas";
import { queryKeys } from "@/lib/query/keys";

/**
 * Search results for `q` (`GET /api/search`). `q` should already be
 * debounced by the caller (`SearchInput`/the search page own the 300ms
 * debounce timer — see `docs/UI_SPEC.md` §2.4) — this hook just decides
 * *whether* to query: a blank query is a distinct UI state ("search your
 * tasks") rather than a real request, per the contract's "missing/empty `q`
 * returns `[]`" rule, so it's skipped here rather than round-tripped.
 */
export function useSearch(q: string): UseQueryResult<SearchResponse> {
  const trimmed = q.trim();
  return useQuery({
    queryKey: queryKeys.search(trimmed),
    queryFn: () => apiClient.search(trimmed),
    enabled: trimmed.length > 0,
  });
}
