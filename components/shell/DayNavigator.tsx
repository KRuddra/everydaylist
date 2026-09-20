"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDaysToCalendarDate } from "@/lib/dates/calendarDate";
import { formatCalendarDateLong, parseCalendarDate, toCalendarDateString } from "@/lib/format/calendarDate";
import { clientToday } from "@/lib/query/optimistic";
import { queryKeys } from "@/lib/query/keys";
import { useOnlineStatus } from "@/lib/query/useOnlineStatus";

interface DayNavigatorProps {
  date: string;
}

/**
 * Prev/next + jump-to-date for the Day screen. `›` is *disabled*, not
 * hidden, once `date` reaches today (no future browsing) — keeps layout
 * stable and is a clearer a11y state than removing the control
 * (`docs/UI_SPEC.md` §2.2).
 */
export function DayNavigator({ date }: DayNavigatorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [open, setOpen] = useState(false);

  const today = clientToday();
  const canGoForward = date < today;

  function goTo(nextDate: string) {
    router.push(`/day/${nextDate}`);
  }

  function handleSelect(selected: Date | undefined) {
    if (!selected) return;
    setOpen(false);
    goTo(toCalendarDateString(selected));
  }

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous day"
        onClick={() => goTo(addDaysToCalendarDate(date, -1))}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 font-semibold" />}>
          <CalendarDays className="size-4" aria-hidden="true" />
          {formatCalendarDateLong(date)}
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto gap-2 p-2">
          <Calendar
            mode="single"
            selected={parseCalendarDate(date)}
            defaultMonth={parseCalendarDate(date)}
            onSelect={handleSelect}
            disabled={(day) => {
              if (day > parseCalendarDate(today)) return true;
              if (!isOnline) {
                return queryClient.getQueryData(queryKeys.day(toCalendarDateString(day))) === undefined;
              }
              return false;
            }}
          />
          {!isOnline ? (
            <p className="px-2 pb-1 text-xs text-muted-foreground">Not available offline outside cached days.</p>
          ) : null}
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Next day"
        disabled={!canGoForward}
        onClick={() => goTo(addDaysToCalendarDate(date, 1))}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
