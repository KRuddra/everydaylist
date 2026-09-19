"use client";

import { usePathname } from "next/navigation";

import { QuickAddFab } from "@/components/task/QuickAddFab";
import { clientToday } from "@/lib/query/optimistic";

const DAY_ROUTE = /^\/day\/(\d{4}-\d{2}-\d{2})$/;

/**
 * Decides *when* to show `QuickAddFab` — Today and Day only, never
 * Stats/Search (`docs/UI_SPEC.md` §1) — and which date it should target.
 * Split out from `(app)/layout.tsx` because that decision needs the current
 * pathname, which only a client component can read.
 */
export function QuickAddFabSlot() {
  const pathname = usePathname();

  if (pathname === "/") {
    return <QuickAddFab targetDate={clientToday()} />;
  }

  const dayMatch = DAY_ROUTE.exec(pathname);
  if (dayMatch?.[1]) {
    return <QuickAddFab targetDate={dayMatch[1]} />;
  }

  return null;
}
