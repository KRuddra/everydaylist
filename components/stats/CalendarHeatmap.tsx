"use client";

import { useEffect, useRef } from "react";

import { HeatmapCell, type HeatmapBucket } from "@/components/stats/HeatmapCell";
import { parseCalendarDate } from "@/lib/format/calendarDate";

export interface HeatmapDay {
  date: string;
  pct: number;
  hasTasks: boolean;
}

interface CalendarHeatmapProps {
  days: HeatmapDay[];
  onSelectDay: (date: string) => void;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucketFor(day: HeatmapDay): { bucket: HeatmapBucket; intensity?: 1 | 2 | 3 } {
  if (!day.hasTasks) return { bucket: "no-tasks" };
  if (day.pct <= 0) return { bucket: "0%" };
  if (day.pct >= 100) return { bucket: "100%" };
  return { bucket: "partial", intensity: day.pct < 34 ? 1 : day.pct < 67 ? 2 : 3 };
}

/**
 * GitHub-style activity grid — week columns × day-of-week rows, horizontally
 * scrollable and defaulting scrolled to the most recent week
 * (`docs/UI_SPEC.md` §2.3).
 */
export function CalendarHeatmap({ days, onSelectDay }: CalendarHeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [days.length]);

  if (days.length === 0) {
    return null;
  }

  const firstDay = days[0]!;
  const firstDow = parseCalendarDate(firstDay.date).getDay();
  const padded: Array<HeatmapDay | null> = [...Array.from({ length: firstDow }, () => null), ...days];
  const weeks: Array<Array<HeatmapDay | null>> = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-label="Task completion activity, past days"
      className="flex snap-x gap-[3px] overflow-x-auto pb-2"
    >
      {weeks.map((week, weekIndex) => {
        const firstRealDay = week.find((day): day is HeatmapDay => day !== null);
        const showMonthLabel = firstRealDay ? parseCalendarDate(firstRealDay.date).getDate() <= 7 : false;
        const monthLabel = showMonthLabel && firstRealDay ? MONTH_LABELS[parseCalendarDate(firstRealDay.date).getMonth()] : "";

        return (
          <div key={weekIndex} className="flex snap-start flex-col gap-[3px]">
            {week.map((day, dayIndex) =>
              day ? (
                <HeatmapCell key={day.date} date={day.date} pct={day.pct} onSelect={() => onSelectDay(day.date)} {...bucketFor(day)} />
              ) : (
                <span key={`pad-${weekIndex}-${dayIndex}`} aria-hidden="true" className="size-[13px]" />
              ),
            )}
            <span aria-hidden="true" className="h-3 text-[0.6rem] text-nowrap text-muted-foreground">
              {monthLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
