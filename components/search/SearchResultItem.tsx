import Link from "next/link";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { CategoryDot } from "@/components/task/CategoryDot";
import { DueDateBadge } from "@/components/task/DueDateBadge";
import { formatCalendarDateShort } from "@/lib/format/calendarDate";
import type { SearchResultItem as SearchResultItemType } from "@/lib/api/schemas";

interface SearchResultItemProps {
  result: SearchResultItemType;
  /** The (already-debounced) query the result matched, for `<mark>` highlighting. */
  query: string;
  today: string;
}

function highlightMatch(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (trimmed.length === 0) return text;
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-xs bg-accent px-0.5 text-accent-foreground">{text.slice(index, index + trimmed.length)}</mark>
      {text.slice(index + trimmed.length)}
    </>
  );
}

/**
 * One search hit: `CategoryDot` + title (bold match via `<mark>`) + date, a
 * matched snippet line, and (if overdue) a compact `DueDateBadge`. Tap
 * navigates to the task's Day view — or Today, if that resolves to today
 * (`docs/UI_SPEC.md` §2.4).
 */
export function SearchResultItem({ result, query, today }: SearchResultItemProps) {
  const overdue = result.dueDate !== null && result.dueDate < today && result.completedDate === null;
  const targetDate = result.completed && result.completedDate ? result.completedDate : today;
  const href = targetDate === today ? "/" : `/day/${targetDate}`;

  const ariaLabelParts = [result.title];
  if (result.completed) ariaLabelParts.push("completed");
  if (overdue) ariaLabelParts.push("overdue");
  ariaLabelParts.push(result.matchedIn === "comment" ? `matched in comment: ${result.matchedText}` : "matched in title");

  return (
    <Link
      href={href}
      aria-label={ariaLabelParts.join(", ")}
      className="flex flex-col gap-1 rounded-lg px-1 py-2 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div aria-hidden="true" className="flex items-center gap-2">
        <CategoryDot category={result.category} size="xs" />
        {result.completed ? <Check className="size-3.5 shrink-0 text-completed" /> : null}
        <p className="min-w-0 flex-1 truncate text-base">
          {result.matchedIn === "title" ? highlightMatch(result.title, query) : result.title}
        </p>
        <Badge variant="outline" className="shrink-0 font-normal">
          {formatCalendarDateShort(targetDate)}
        </Badge>
      </div>
      <div aria-hidden="true" className="flex flex-wrap items-center gap-2 pl-5 text-sm text-muted-foreground">
        {overdue && result.dueDate ? <DueDateBadge date={result.dueDate} overdue variant="compact" /> : null}
        {result.matchedIn === "title" ? (
          <span>matched in title</span>
        ) : (
          <span className="italic">&ldquo;{highlightMatch(result.matchedText, query)}&rdquo;</span>
        )}
      </div>
    </Link>
  );
}
