import { Flame } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  label: string;
  count: number;
  variant: "current" | "longest";
  className?: string;
}

/** Current/longest streak counter card, in the Stats page's stat row. */
export function StreakBadge({ label, count, variant, className }: StreakBadgeProps) {
  return (
    <Card size="sm" className={cn("flex-1", className)}>
      <CardContent className="flex flex-col items-center gap-1 text-center">
        <span className="flex items-center gap-1 text-2xl font-bold">
          <Flame
            className={cn("size-5", variant === "current" && count > 0 ? "text-today" : "text-muted-foreground")}
            aria-hidden="true"
          />
          {count}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
        {count === 0 ? (
          <span className="text-[0.65rem] text-muted-foreground">Complete a task to start a streak</span>
        ) : null}
      </CardContent>
    </Card>
  );
}
