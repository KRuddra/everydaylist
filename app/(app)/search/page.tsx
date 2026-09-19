"use client";

import { useState } from "react";
import { Search as SearchIcon, SearchX } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchResultItem } from "@/components/search/SearchResultItem";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearch } from "@/lib/query/hooks/useSearch";
import { clientToday } from "@/lib/query/optimistic";
import { useOnlineStatus } from "@/lib/query/useOnlineStatus";

const DEBOUNCE_MS = 300;

/** Full-text search across all past days' task titles and comments (`docs/UI_SPEC.md` §2.4). */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const isOnline = useOnlineStatus();
  const searchQuery = useSearch(debouncedQuery);
  const today = clientToday();
  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <div>
        <SearchInput value={query} onChange={setQuery} disabled={!isOnline} />
        {!isOnline ? <p className="pt-1 text-xs text-muted-foreground">Search needs a connection.</p> : null}
      </div>

      {!hasQuery ? (
        <EmptyState icon={SearchIcon} title="Search your tasks and comments" />
      ) : null}

      {hasQuery && searchQuery.isLoading ? <ListSkeleton rows={3} /> : null}

      {hasQuery && searchQuery.isError ? (
        <EmptyState variant="error" title="Couldn't search" onRetry={() => void searchQuery.refetch()} />
      ) : null}

      {hasQuery && !searchQuery.isLoading && !searchQuery.isError && searchQuery.data?.length === 0 ? (
        <EmptyState icon={SearchX} title={`No results for “${debouncedQuery.trim()}”`} description="Try a different keyword" />
      ) : null}

      {hasQuery && !searchQuery.isLoading && !searchQuery.isError && searchQuery.data && searchQuery.data.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border/60">
          {searchQuery.data.map((result) => (
            <li key={result.taskId}>
              <SearchResultItem result={result} query={debouncedQuery} today={today} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
