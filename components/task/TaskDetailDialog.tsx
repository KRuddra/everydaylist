"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Flag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommentComposer } from "@/components/task/CommentComposer";
import { CommentThread } from "@/components/task/CommentThread";
import { DueDateBadge } from "@/components/task/DueDateBadge";
import { PriorityFlag } from "@/components/task/PriorityFlag";
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
 * Focused single-task view: title, editable priority/due-date (via
 * `Popover`s), comment thread + composer, and a minimal delete action
 * (`docs/UI_SPEC.md` §3/§7 — no dedicated delete UI was specified beyond
 * "confirm scope"; this ships the minimal surface the API supports).
 */
export function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addComment = useAddComment();
  const comments = useComments(task?.id ?? "", task?.comments);
  const today = clientToday();

  if (!task) {
    return null;
  }

  const overdue = task.dueDate !== null && task.dueDate < today && task.completedDate === null;

  function handlePriorityChange(priority: TaskPriority | null) {
    setPriorityOpen(false);
    updateTask.mutate({ taskId: task!.id, edits: { priority } });
  }

  function handleDueDateChange(date: Date | undefined) {
    setDueDateOpen(false);
    updateTask.mutate({ taskId: task!.id, edits: { dueDate: date ? toCalendarDateString(date) : null } });
  }

  function handleDelete() {
    deleteTask.mutate({ taskId: task!.id });
    onOpenChange(false);
  }

  function handleAddComment(body: string) {
    addComment.mutate({ taskId: task!.id, id: crypto.randomUUID(), body });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
              <Flag className="size-3.5" aria-hidden="true" />
              {task.priority ? `${task.priority[0]!.toUpperCase()}${task.priority.slice(1)} priority` : "Set priority"}
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
              {task.dueDate ? "Change due date" : "Set due date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto gap-2 p-2">
              <Calendar mode="single" selected={task.dueDate ? parseCalendarDate(task.dueDate) : undefined} onSelect={handleDueDateChange} />
              {task.dueDate ? (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => handleDueDateChange(undefined)}>
                  Clear due date
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>

          {task.dueDate ? <DueDateBadge date={task.dueDate} overdue={overdue} /> : null}
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
