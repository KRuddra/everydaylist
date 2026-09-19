import { QueryClient } from "@tanstack/react-query";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One `QueryClient` per app instance (created once in `app/Providers.tsx` via
 * `useState(() => createAppQueryClient())`).
 *
 * `gcTime` is deliberately long (7 days, well beyond the default 5 minutes):
 * this *is* the offline outbox/cache — see `app/Providers.tsx` for the
 * IndexedDB persistence that keeps it alive across reloads. A short `gcTime`
 * would let a stale-but-not-yet-synced query get garbage collected before
 * the user reconnects.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 7 * ONE_DAY_MS,
        refetchOnWindowFocus: false,
        retry: 2,
      },
      mutations: {
        gcTime: 7 * ONE_DAY_MS,
      },
    },
  });
}
