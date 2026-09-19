"use client";

import { useState, type ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { persister } from "@/lib/query/persister";
import { createAppQueryClient } from "@/lib/query/queryClient";
import { registerMutationDefaults } from "@/lib/query/registerMutationDefaults";

const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * App-wide data layer: one `QueryClient` (created once per app instance,
 * never per render — see the `useState` initializer) wrapped in
 * `PersistQueryClientProvider` so the cache — including paused offline
 * mutations — survives a reload via IndexedDB (`lib/query/persister.ts`).
 *
 * `shouldDehydrateMutation: () => true` is what actually persists paused
 * mutations (by default only successful queries are dehydrated); combined
 * with `registerMutationDefaults` (called synchronously right after the
 * client is created, before any component can enqueue a mutation), a
 * mutation queued while offline can be resumed after the page is closed and
 * reopened, not just after a soft reconnect within the same session.
 *
 * Mounted at the root layout (not scoped to the authenticated `(app)`
 * segment) so `/login`'s `useLogin` mutation hook has a `QueryClient` to run
 * against too.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient();
    registerMutationDefaults(client);
    return client;
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: MAX_CACHE_AGE_MS,
        dehydrateOptions: {
          shouldDehydrateMutation: () => true,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
