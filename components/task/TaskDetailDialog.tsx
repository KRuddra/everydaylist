"use client";

import { useState, type KeyboardEvent } from "react";
import { Calendar as CalendarIcon, Flag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryDot } from "@/components/task/CategoryDot";
import { CommentComposer } from "@/components/task/CommentComposer";
import { CommentThread } from "@/components/task/CommentThread";
import { DueDateBadge } from "@/components/task/DueDateBadge";
import { PriorityFlag } from "@/components/task/PriorityFlag";
import { CATEGORIES, getCategoryLabel, type CategorySlug } from "@/lib/config/categories";
import { parseCalendarDate, toCalendarDateString } from "@/lib/format/calendarDate";
import { useAddComment, useComments } from "@/lib/query/hooks/useComments";
import { useDeleteTask, useUpdateTask } from "@/lib/query/hooks/useTaskMutations";
import { clientToday } from "@/lib/query/optimistic";
import type { TaskPriority, TaskResponse } from "@/lib/api/schemas";

const PRIORITY_OPTIONS: Array<{ value: TaskPriority | null; label: string }> = [
  { value: null, label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

interface TaskDetailDialogProps {
  task: TaskResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Editable single-task view: rename the task, move it between categories,
 * change its priority / due date (all via the API's `PATCH`), read + add
 * comments, and delete. Changing a task's category moves it out of the
 * currently-open section, which naturally closes this dialog.
 */
export function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addComment = useAddComment();
  const comments = useComments(task?.id ?? "", task?.comments);
  const today = clientToday();

  if (!task) {
    return null;
  }

  const activeTask = task;
  const overdue =
    activeTask.dueDate !== null && activeTask.dueDate < today && activeTask.completedDate === null;

  function handleTitleSave(title: string) {
    updateTask.mutate({ taskId: activeTask.id, edits: { title } });
  }

  function handleCategoryChange(category: CategorySlug) {
    setCategoryOpen(false);
    if (category !== activeTask.category) {
      updateTask.mutate({ taskId: activeTask.id, edits: { category } });
    }
  }

  function handlePriorityChange(priority: TaskPriority | null) {
    setPriorityOpen(false);
    updateTask.mutate({ taskId: activeTask.id, edits: { priority } });
  }

  function handleDueDateChange(date: Date | undefined) {
    setDueDateOpen(false);
    updateTask.mutate({
      taskId: activeTask.id,
      edits: { dueDate: date ? toCalendarDateString(date) : null },
    });
  }

  function handleDelete() {
    deleteTask.mutate({ taskId: activeTask.id });
    onOpenChange(false);
  }

  function handleAddComment(body: string) {
    addComment.mutate({ taskId: activeTask.id, id: crypto.randomUUID(), body });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit task</DialogTitle>
          <TaskTitleField key={activeTask.id} title={activeTask.title} onSave={handleTitleSave} />
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
              <CategoryDot category={activeTask.category} />
              {getCategoryLabel(activeTask.category)}
            </PopoverTrigger>
            <PopoverContent className="w-44 gap-1 p-1">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.slug}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => handleCategoryChange(category.slug)}
                >
                  <CategoryDot category={category.slug} />
                  {category.label}
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
              <Flag className="size-3.5" aria-hidden="true" />
              {activeTask.priority
                ? `${activeTask.priority[0]!.toUpperCase()}${activeTask.priority.slice(1)} priority`
                : "Set priority"}
            </PopoverTrigger>
            <PopoverContent className="w-40 gap-1 p-1">
              {PRIORITY_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => handlePriorityChange(option.value)}
                >
                  <PriorityFlag priority={option.value} />
                  {option.label}
                </Button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
              <CalendarIcon className="size-3.5" aria-hidden="true" />
              {activeTask.dueDate ? "Change due date" : "Set due date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto gap-2 p-2">
              <Calendar
                mode="single"
                selected={activeTask.dueDate ? parseCalendarDate(activeTask.dueDate) : undefined}
                onSelect={handleDueDateChange}
              />
              {activeTask.dueDate ? (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => handleDueDateChange(undefined)}>
                  Clear due date
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>

          {activeTask.dueDate ? <DueDateBadge date={activeTask.dueDate} overdue={overdue} /> : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <CommentThread
            comments={comments.data}
            loading={comments.isLoading}
            error={comments.isError}
            onRetry={() => void comments.refetch()}
          />
        </div>

        <CommentComposer onSubmit={handleAddComment} />

        <DialogFooter>
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleDelete}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline-editable task title. Keyed by task id by the parent so its `useState`
 * initializer re-seeds when a different task opens (no set-state-in-effect).
 * Commits on blur or Enter; an empty title reverts rather than saving.
 */
function TaskTitleField({ title, onSave }: { title: string; onSave: (title: string) => void }) {
  const [draft, setDraft] = useState(title);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setDraft(title);
      return;
    }
    if (trimmed !== title) {
      onSave(trimmed);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      aria-label="Task title"
      maxLength={500}
      className="-mx-1 w-full rounded-md bg-transparent px-1 pr-8 text-left text-lg font-semibold outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}
