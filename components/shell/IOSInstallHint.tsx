"use client";

import { useSyncExternalStore } from "react";
import { Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "eal:ios-install-hint-dismissed";
const CHANGE_EVENT = "eal:ios-install-hint:changed";

function isIosSafariInstallCandidate(): boolean {
  if (typeof window === "undefined") return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  return isIOS && !isStandalone;
}

// Read via `useSyncExternalStore` (not `useEffect` + `setState`) so this
// stays a subscription to external browser state — `localStorage` and
// `matchMedia` — rather than the derived-state-via-effect anti-pattern.
// `getServerSnapshot` always returns the "hidden" value so SSR/hydration
// never has to guess a browser-only fact.

function subscribeDismissed(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getDismissedSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function getDismissedServerSnapshot(): boolean {
  return true;
}

function subscribeEligible(callback: () => void): () => void {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getEligibleServerSnapshot(): boolean {
  return false;
}

/** Resets the dismissed `IOSInstallHint` — called from the header overflow menu's "Install app" item. */
export function replayIOSInstallHint(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Dismissible "Add to Home Screen" banner, shown only for iOS Safari when
 * not already installed (standalone) — desktop/Android browsers get a
 * native install prompt instead, so this stays iOS-only. `dismissed`
 * persists to `localStorage` and can be replayed from the overflow menu.
 */
export function IOSInstallHint() {
  const dismissed = useSyncExternalStore(subscribeDismissed, getDismissedSnapshot, getDismissedServerSnapshot);
  const eligible = useSyncExternalStore(subscribeEligible, isIosSafariInstallCandidate, getEligibleServerSnapshot);

  if (!eligible || dismissed) {
    return null;
  }

  function handleDismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <div className="flex items-start gap-3 border-b border-border bg-accent px-4 py-3 text-sm text-accent-foreground">
      <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">Install Everyday List: tap Share, then &ldquo;Add to Home Screen&rdquo;.</p>
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss install hint" onClick={handleDismiss}>
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
