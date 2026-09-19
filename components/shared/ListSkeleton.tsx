import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  /** Number of shimmering rows, for `variant="row"`. */
  rows?: number;
  /** `"row"`: task-list-shaped rows (Today/Day/Search). `"block"`: larger shapes (Stats' stat row + heatmap). */
  variant?: "row" | "block";
  className?: string;
}

/** Loading placeholder — no network/interactivity, so this stays a server component. */
export function ListSkeleton({ rows = 3, variant = "row", className }: ListSkeletonProps) {
  if (variant === "block") {
    return (
      <div aria-hidden="true" className={cn("flex flex-col gap-3", className)}>
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
