import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createStore, del, get, set } from "idb-keyval";
import type { Persister } from "@tanstack/react-query-persist-client";

/**
 * IndexedDB-backed persister for `PersistQueryClientProvider`
 * (`app/Providers.tsx`) — this *is* the offline outbox: the query cache
 * (including paused mutations, see `dehydrateOptions.shouldDehydrateMutation`
 * on the provider) is written here so it survives a reload while offline.
 *
 * `idb-keyval`'s `get`/`set`/`del` are adapted to the `getItem`/`setItem`/
 * `removeItem` shape `createAsyncStoragePersister` expects, against a
 * dedicated object store (not the library's shared default store) so this
 * cache doesn't collide with any other IndexedDB usage.
 *
 * `undefined` on the server (SSR/build): `createAsyncStoragePersister`
 * accepts `storage: undefined` and simply no-ops, and `idb-keyval`/`indexedDB`
 * don't exist outside the browser — guarded here rather than at every call
 * site.
 */
const idbStore = typeof indexedDB !== "undefined" ? createStore("everydaylist-cache", "react-query") : undefined;

const idbStorage = idbStore
  ? {
      getItem: (key: string) => get(key, idbStore),
      setItem: (key: string, value: string) => set(key, value, idbStore),
      removeItem: (key: string) => del(key, idbStore),
    }
  : undefined;

export const persister: Persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: "everydaylist-query-cache",
  throttleTime: 1000,
});
