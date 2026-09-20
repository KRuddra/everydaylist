"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { CalendarHeatmap } from "@/components/stats/CalendarHeatmap";
import { ProgressRing } from "@/components/stats/ProgressRing";
import { StreakBadge } from "@/components/stats/StreakBadge";
import { Card, CardContent } from "@/components/ui/card";
import { addDaysToCalendarDate } from "@/lib/dates/calendarDate";
import { useStats } from "@/lib/query/hooks/useStats";
import { clientToday } from "@/lib/query/optimistic";
import { useOnlineStatus } from "@/lib/query/useOnlineStatus";

/** 12 weeks — enough to feel like a real activity history without an unbounded query range. */
const HEATMAP_DAYS = 84;

/** Stats (`/stats`) — today's %, streaks, and a heatmap of history (`docs/UI_SPEC.md` §2.3). */
export default function StatsPage() {
  const router = useRouter();
  const today = clientToday();
  const from = addDaysToCalendarDate(today, -(HEATMAP_DAYS - 1));
  const statsQuery = useStats(from, today);
  const isOnline = useOnlineStatus();

  const todayEntry = statsQuery.data?.days.find((day) => day.day === today);
  const todayPercent = todayEntry?.percent ?? 0;
  const heatmapDays = (statsQuery.data?.days ?? []).map((day) => ({
    date: day.day,
    pct: day.percent,
    hasTasks: day.inPlay > 0,
  }));
  const showStaleCaption = !isOnline && Boolean(statsQuery.data) && statsQuery.dataUpdatedAt > 0;

  function handleSelectDay(date: string) {
    router.push(date === today ? "/" : `/day/${date}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <h2 className="text-[28px] leading-9 font-bold tracking-tight">Stats</h2>

      {statsQuery.isError ? (
        <EmptyState
          variant="error"
          title="Couldn't load stats"
          description="Something went wrong. Please try again."
          onRetry={() => void statsQuery.refetch()}
        />
      ) : null}

      {statsQuery.isLoading ? <ListSkeleton variant="block" /> : null}

      {!statsQuery.isError && !statsQuery.isLoading && statsQuery.data ? (
        <>
          <div className="flex gap-3">
            <Card size="sm" className="flex-1 items-center justify-center">
              <CardContent className="flex flex-col items-center gap-1">
                <ProgressRing value={todayPercent} size="lg" />
                <span className="text-xs text-muted-foreground">Today</span>
              </CardContent>
            </Card>
            <StreakBadge label="Current streak" count={statsQuery.data.currentStreak} variant="current" />
            <StreakBadge label="Longest streak" count={statsQuery.data.longestStreak} variant="longest" />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold">Activity</h3>
            <CalendarHeatmap days={heatmapDays} onSelectDay={handleSelectDay} />
            {showStaleCaption ? (
              <p className="text-xs text-muted-foreground">Updated {format(new Date(statsQuery.dataUpdatedAt), "MMM d, h:mm a")}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
