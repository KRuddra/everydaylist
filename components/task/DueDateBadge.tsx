import { AlertTriangle, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCalendarDateShort } from "@/lib/format/calendarDate";
import { cn } from "@/lib/utils";

interface DueDateBadgeProps {
  date: string;
  overdue: boolean;
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Due date chip. Switches to overdue styling (`--overdue` token) + a "‼"
 * affix when `overdue` is true — callers decide overdue-ness (evaluated
 * against *real* today, never the viewed date — see `TaskItem`).
 */
export function DueDateBadge({ date, overdue, variant = "default", className }: DueDateBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        overdue && "border-overdue text-overdue",
        variant === "compact" && "h-4 px-1.5 text-[0.65rem]",
        className,
      )}
    >
      {overdue ? (
        <AlertTriangle className="size-3" aria-hidden="true" />
      ) : (
        <Calendar className="size-3" aria-hidden="true" />
      )}
      <span aria-hidden="true">
        {formatCalendarDateShort(date)}
        {overdue ? "‼" : ""}
      </span>
      <span className="sr-only">
        {overdue ? `Overdue, was due ${formatCalendarDateShort(date)}` : `Due ${formatCalendarDateShort(date)}`}
      </span>
    </Badge>
  );
}
