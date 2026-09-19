import { TaskItem } from "@/components/task/TaskItem";
import type { TaskResponse } from "@/lib/api/schemas";

interface TaskListItem {
  task: TaskResponse;
  struck: boolean;
  overdue: boolean;
  showRolloverHint: boolean;
}

interface TaskListProps {
  items: TaskListItem[];
  onToggle: (taskId: string) => void;
  onOpen: (taskId: string) => void;
  togglingTaskId?: string | null;
}

/** Renders an ordered list of `TaskItem` for one category — server response order, never re-sorted client-side. */
export function TaskList({ items, onToggle, onOpen, togglingTaskId }: TaskListProps) {
  return (
    <ul className="flex flex-col">
      {items.map(({ task, struck, overdue, showRolloverHint }) => (
        <li key={task.id}>
          <TaskItem
            task={task}
            struck={struck}
            overdue={overdue}
            showRolloverHint={showRolloverHint}
            onToggle={() => onToggle(task.id)}
            onOpen={() => onOpen(task.id)}
            toggleDisabled={togglingTaskId === task.id}
          />
        </li>
      ))}
    </ul>
  );
}
