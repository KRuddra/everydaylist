// Service worker entry, compiled by @serwist/next at build time.
//
// This file runs in a Web Worker (not the DOM), so it is excluded from the main
// `tsc` pass in tsconfig.json to avoid DOM/WebWorker lib conflicts. Serwist
// injects the precache manifest (`self.__SW_MANIFEST`) during the webpack build.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
