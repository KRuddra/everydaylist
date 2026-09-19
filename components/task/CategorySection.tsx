"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { CategoryDot } from "@/components/task/CategoryDot";
import { TaskComposer } from "@/components/task/TaskComposer";
import { TaskDetailDialog } from "@/components/task/TaskDetailDialog";
import { TaskList } from "@/components/task/TaskList";
import { getCategoryLabel, type CategorySlug } from "@/lib/config/categories";
import { useToggleComplete } from "@/lib/query/hooks/useTaskMutations";
import { clientToday } from "@/lib/query/optimistic";
import type { TaskResponse } from "@/lib/api/schemas";

interface CategorySectionProps {
  category: CategorySlug;
  tasks: TaskResponse[];
  /** The date being viewed — Today's date, or the browsed `Day` date. Completion toggles target this date, not "today" (`docs/API_CONTRACT.md` #3). */
  viewedDate: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

/**
 * One category's header (dot, label, completed/total count), task list, and
 * inline "+ Add task" entry point. Owns its own toggle-complete mutation and
 * `TaskDetailDialog` instance, keeping the Today/Day pages themselves thin.
 */
export function CategorySection({ category, tasks, viewedDate, loading, error, onRetry }: CategorySectionProps) {
  const [composing, setComposing] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const toggleComplete = useToggleComplete();
  const today = clientToday();

  const completedCount = tasks.filter((task) => task.completed).length;
  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;

  function handleToggle(taskId: string) {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;
    toggleComplete.mutate({
      taskId: task.id,
      date: viewedDate,
      action: task.completed ? "reopen" : "complete",
    });
  }

  return (
    <section aria-labelledby={`category-${category}-heading`} className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <h2 id={`category-${category}-heading`} className="flex items-center gap-2 text-lg font-semibold">
          <CategoryDot category={category} />
          {getCategoryLabel(category)}
        </h2>
        <Badge variant="secondary" className="font-normal">
          {completedCount} / {tasks.length}
        </Badge>
      </div>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <EmptyState
          variant="error"
          title="Couldn't load tasks"
          description="Something went wrong loading this category."
          onRetry={onRetry}
        />
      ) : (
        <>
          {tasks.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">No tasks yet — add one below</p>
          ) : (
            <TaskList
              items={tasks.map((task) => ({
                task,
                struck: task.completed,
                overdue: task.dueDate !== null && task.dueDate < today && task.completedDate === null,
                showRolloverHint: task.createdDate < viewedDate,
              }))}
              onToggle={handleToggle}
              onOpen={setOpenTaskId}
            />
          )}

          {composing ? (
            <TaskComposer
              mode="inline"
              defaultCategory={category}
              targetDate={viewedDate}
              onDone={() => setComposing(false)}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-1.5 px-1 text-muted-foreground"
              onClick={() => setComposing(true)}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add task
            </Button>
          )}
        </>
      )}

      <TaskDetailDialog
        task={openTask}
        open={openTaskId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setOpenTaskId(null);
        }}
      />
    </section>
  );
}
