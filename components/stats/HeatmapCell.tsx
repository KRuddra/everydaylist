import { formatCalendarDateLong } from "@/lib/format/calendarDate";
import { cn } from "@/lib/utils";

export type HeatmapBucket = "no-tasks" | "0%" | "partial" | "100%";

interface HeatmapCellProps {
  date: string;
  pct: number;
  bucket: HeatmapBucket;
  intensity?: 1 | 2 | 3;
  onSelect: () => void;
}

const INTENSITY_CLASS: Record<1 | 2 | 3, string> = {
  1: "bg-completed/30",
  2: "bg-completed/65",
  3: "bg-completed",
};

/**
 * One day's cell in `CalendarHeatmap`. Four semantic buckets — color alone
 * can't convey the bucket to screen-reader/colorblind users, so `no-tasks`
 * uses a dashed outline (not just a lighter fill) and every cell carries a
 * descriptive `aria-label`/`title` (`docs/UI_SPEC.md` §2.3/§6).
 */
export function HeatmapCell({ date, pct, bucket, intensity, onSelect }: HeatmapCellProps) {
  const label = bucket === "no-tasks" ? `${formatCalendarDateLong(date)} — no tasks` : `${formatCalendarDateLong(date)} — ${pct}% complete`;

  return (
    <button
      type="button"
      role="gridcell"
      title={label}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "size-[13px] rounded-[2px] transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        bucket === "no-tasks" && "border border-dashed border-muted-foreground/40 bg-transparent",
        bucket === "0%" && "bg-muted",
        bucket === "100%" && "bg-completed",
        bucket === "partial" ? INTENSITY_CLASS[intensity ?? 1] : null,
      )}
    />
  );
}
