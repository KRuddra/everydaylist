"use client";

import { useEffect, useRef } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

import { useOnlineStatus } from "@/lib/query/useOnlineStatus";

/**
 * Persistent offline indicator in the header (icon always visible; label
 * hidden below `sm:` to save space). Fires a transient 3s `sonner` toast on
 * every online↔offline *transition* — never on steady state, and never on
 * first mount (`docs/UI_SPEC.md` §1).
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const previous = useRef<boolean | null>(null);

  useEffect(() => {
    if (previous.current === null) {
      previous.current = isOnline;
      return;
    }
    if (previous.current !== isOnline) {
      previous.current = isOnline;
      toast(isOnline ? "Back online — syncing…" : "You're offline — changes will sync later.", {
        duration: 3000,
      });
    }
  }, [isOnline]);

  if (isOnline) {
    return null;
  }

  return (
    <span role="status" className="flex items-center gap-1 text-destructive">
      <WifiOff className="size-4" aria-hidden="true" />
      <span className="hidden text-xs font-medium sm:inline">Offline</span>
    </span>
  );
}
