"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History as HistoryIcon, ListChecks, Search as SearchIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { clientToday } from "@/lib/query/optimistic";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}

/**
 * Primary navigation — Today/History/Stats/Search. Renders as a sticky
 * bottom tab bar under `md:`, and a fixed left sidebar at `md:` and up
 * (`docs/UI_SPEC.md` §1). The active tab is signalled by both color/weight
 * (not the sole signal) and `aria-current="page"`.
 */
export function AppNav() {
  const pathname = usePathname();
  const today = clientToday();

  const items: NavItem[] = [
    { href: "/", label: "Today", icon: ListChecks, active: pathname === "/" },
    { href: `/day/${today}`, label: "History", icon: HistoryIcon, active: pathname.startsWith("/day") },
    { href: "/stats", label: "Stats", icon: BarChart3, active: pathname === "/stats" },
    { href: "/search", label: "Search", icon: SearchIcon, active: pathname === "/search" },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:h-auto md:w-20 md:flex-col md:justify-start md:gap-2 md:border-t-0 md:border-r md:pt-6 md:pb-0"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground md:flex-none md:gap-1 md:py-3",
              item.active && "font-medium text-primary hover:text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
