"use client";

import { use } from "react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { DayNavigator } from "@/components/shell/DayNavigator";
import { CategorySection } from "@/components/task/CategorySection";
import { Button } from "@/components/ui/button";
import { CATEGORY_SLUGS } from "@/lib/config/categories";
import { useDayTasks } from "@/lib/query/hooks/useDayTasks";
import { clientToday } from "@/lib/query/optimistic";

/** Day (browse a past date, `/day/[date]`) — reuses the Today body 1:1, swaps the sub-header for `DayNavigator` (`docs/UI_SPEC.md` §2.2). */
export default function DayPage(props: PageProps<"/day/[date]">) {
  const { date } = use(props.params);
  const today = clientToday();
  const dayQuery = useDayTasks(date);
  const tasks = dayQuery.data?.tasks ?? [];
  const isPastDay = date !== today;

  return (
    <div className="flex flex-1 flex-col gap-8 py-2">
      <DayNavigator date={date} />

      {isPastDay ? (
        <div className="-mx-4 flex items-center justify-between bg-muted px-4 py-2 text-sm md:-mx-8 md:px-8">
          <span>Viewing a past day</span>
          <Button variant="ghost" size="sm" render={<Link href="/" />}>
            Back to Today
          </Button>
        </div>
      ) : null}

      {dayQuery.isError ? (
        <EmptyState
          variant="error"
          title="Couldn't load this day"
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
              viewedDate={date}
            />
          ))
        : null}
    </div>
  );
}
