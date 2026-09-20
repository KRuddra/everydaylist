"use client";

import { MessageCircle } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { DueDateBadge } from "@/components/task/DueDateBadge";
import { PriorityFlag } from "@/components/task/PriorityFlag";
import { formatCalendarDateShort } from "@/lib/format/calendarDate";
import { cn } from "@/lib/utils";
import type { TaskResponse } from "@/lib/api/schemas";

interface TaskItemProps {
  task: TaskResponse;
  /** Relative to the currently viewed date (Today or a browsed Day) — see `docs/API_CONTRACT.md` #3. */
  struck: boolean;
  /** Evaluated against *real* today regardless of the viewed date (`docs/UI_SPEC.md` §2.2). */
  overdue: boolean;
  /** `createdDate < viewedDate` — shows the "since {date}" caption. */
  showRolloverHint: boolean;
  onToggle: () => void;
  onOpen: () => void;
  toggleDisabled?: boolean;
}

/**
 * Single task row — the one source of truth for how a task renders; Today,
 * Day, and (via `SearchResultItem`'s compact variant) Search all build on
 * this (`docs/UI_SPEC.md` §0). Strikethrough is never the only completion
 * signal: it always pairs with the checked `Checkbox` (color + icon) and an
 * `aria-label` stating "completed" explicitly.
 *
 * The checkbox is a real, separately focusable control in its own ~44×44
 * tap zone; the rest of the row is a single `<button>` (title, flags,
 * badges, comment count) — kept as siblings, not nested, so no interactive
 * control ends up inside another one.
 */
export function TaskItem({ task, struck, overdue, showRolloverHint, onToggle, onOpen, toggleDisabled }: TaskItemProps) {
  const commentCount = task.comments.length;
  const hasMeta = (task.priority !== null && task.priority !== "low") || task.dueDate !== null;

  const rowLabelParts = [task.title];
  if (struck) rowLabelParts.push("completed");
  if (overdue && !struck) rowLabelParts.push("overdue");
  if (commentCount > 0) rowLabelParts.push(`${commentCount} comment${commentCount === 1 ? "" : "s"}`);

  return (
    <div className="flex w-full items-stretch gap-1 rounded-lg transition-colors hover:bg-muted">
      <div className="flex shrink-0 items-center py-3.5 pr-2 pl-4">
        <Checkbox
          checked={struck}
          onCheckedChange={() => onToggle()}
          disabled={toggleDisabled}
          aria-label={struck ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
          className={cn(
            struck &&
              "border-completed bg-completed text-completed-foreground data-checked:border-completed data-checked:bg-completed",
          )}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        aria-label={rowLabelParts.join(", ")}
        className="flex min-h-14 min-w-0 flex-1 items-start gap-2 rounded-lg py-3.5 pr-4 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p aria-hidden="true" className={cn("line-clamp-2 text-base font-normal", struck && "text-muted-foreground line-through")}>
            {task.title}
          </p>
          {showRolloverHint ? (
            <p aria-hidden="true" className="text-xs text-muted-foreground">
              since {formatCalendarDateShort(task.createdDate)}
            </p>
          ) : null}
          {hasMeta ? (
            <div aria-hidden="true" className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <PriorityFlag priority={task.priority} />
              {task.dueDate ? <DueDateBadge date={task.dueDate} overdue={overdue && !struck} /> : null}
            </div>
          ) : null}
        </div>

        <div aria-hidden="true" className="flex shrink-0 items-center gap-1 self-center text-xs text-muted-foreground">
          <MessageCircle className={cn("size-3.5", commentCount > 0 && "text-foreground")} />
          <span className={cn(commentCount > 0 && "text-foreground")}>{commentCount}</span>
        </div>
      </button>
    </div>
  );
}
