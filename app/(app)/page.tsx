"use client";

import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { ProgressRing } from "@/components/stats/ProgressRing";
import { CategorySection } from "@/components/task/CategorySection";
import { CATEGORY_SLUGS } from "@/lib/config/categories";
import { formatCalendarDateLong } from "@/lib/format/calendarDate";
import { useDayTasks } from "@/lib/query/hooks/useDayTasks";
import { clientToday } from "@/lib/query/optimistic";

/** Today (landing, `/`) — today's rolling task list, grouped by the 3 fixed categories (`docs/UI_SPEC.md` §2.1). */
export default function TodayPage() {
  const today = clientToday();
  const dayQuery = useDayTasks(today);
  const tasks = dayQuery.data?.tasks ?? [];
  const percentComplete =
    tasks.length === 0 ? 0 : Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{formatCalendarDateLong(today)} · Today</h2>
        <Link href="/stats" aria-label={`View stats, ${percentComplete}% complete today`}>
          <ProgressRing value={percentComplete} size="sm" />
        </Link>
      </div>

      {dayQuery.isError ? (
        <EmptyState
          variant="error"
          title="Couldn't load today's tasks"
          description="Something went wrong. Please try again."
          onRetry={() => void dayQuery.refetch()}
        />
      ) : null}

      {dayQuery.isLoading ? (
        <div className="flex flex-col gap-6">
          {CATEGORY_SLUGS.map((slug) => (
            <ListSkeleton key={slug} rows={3} />
          ))}
        </div>
      ) : null}

      {!dayQuery.isError && !dayQuery.isLoading
        ? CATEGORY_SLUGS.map((slug) => (
            <CategorySection
              key={slug}
              category={slug}
              tasks={tasks.filter((task) => task.category === slug)}
              viewedDate={today}
            />
          ))
        : null}
    </div>
  );
}
