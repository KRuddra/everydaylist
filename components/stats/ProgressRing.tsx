import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: "sm" | "lg";
  showLabel?: boolean;
  className?: string;
}

const DIMENSION: Record<"sm" | "lg", number> = { sm: 28, lg: 96 };
const STROKE: Record<"sm" | "lg", number> = { sm: 3, lg: 8 };

/** Circular completion % indicator — sm (28px) in the Today header, lg (96px) on Stats. Plain inline SVG; no shadcn primitive covers this shape. */
export function ProgressRing({ value, size = "sm", showLabel = true, className }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const dimension = DIMENSION[size];
  const stroke = STROKE[size];
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      role="img"
      aria-label={`${clamped}% complete`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: dimension, height: dimension }}
    >
      <svg width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`} className="-rotate-90" aria-hidden="true">
        <circle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="var(--completed)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel ? (
        <span aria-hidden="true" className={cn("absolute font-semibold", size === "lg" ? "text-2xl" : "text-[0.55rem]")}>
          {clamped}%
        </span>
      ) : null}
    </div>
  );
}
