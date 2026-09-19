import { Flag } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/api/schemas";

const PRIORITY_CLASS: Record<Exclude<TaskPriority, "low">, string> = {
  medium: "text-priority-medium",
  high: "text-priority-high",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};

interface PriorityFlagProps {
  priority: TaskPriority | null;
  className?: string;
}

/**
 * Priority indicator icon. Renders nothing for `"low"` (and `null`) by
 * design — omitting the icon *is* the low-priority signal, reducing visual
 * noise (`docs/UI_SPEC.md` §2.1).
 */
export function PriorityFlag({ priority, className }: PriorityFlagProps) {
  if (priority === null || priority === "low") {
    return null;
  }

  return (
    <Flag
      className={cn("size-3.5 shrink-0 fill-current", PRIORITY_CLASS[priority], className)}
      aria-label={PRIORITY_LABEL[priority]}
    />
  );
}
