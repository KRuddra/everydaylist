import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { TaskResponse } from "@/lib/api/schemas";

import { TaskItem } from "./TaskItem";

function buildTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: "0e6a6f2a-2f2a-4f2a-8f2a-2f2a4f2a8f2a",
    category: "reminders",
    title: "Water the plants",
    priority: null,
    dueDate: null,
    createdDate: "2024-06-01",
    completedDate: null,
    completed: false,
    sortOrder: 0,
    createdAt: "2024-06-01T12:00:00.000Z",
    updatedAt: "2024-06-01T12:00:00.000Z",
    comments: [],
    ...overrides,
  };
}

describe("TaskItem", () => {
  it("is struck through when `struck` is true (completed relative to the viewed date)", () => {
    render(
      <TaskItem
        task={buildTask({ title: "Renew library card" })}
        struck
        overdue={false}
        showRolloverHint={false}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    const title = screen.getByText("Renew library card");
    expect(title).toHaveClass("line-through");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("is not struck through when `struck` is false, even if the task was completed on a different day", () => {
    render(
      <TaskItem
        task={buildTask({ title: "Renew library card", completed: true, completedDate: "2024-05-20" })}
        struck={false}
        overdue={false}
        showRolloverHint={false}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    const title = screen.getByText("Renew library card");
    expect(title).not.toHaveClass("line-through");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("shows an overdue due-date badge when overdue and not struck", () => {
    render(
      <TaskItem
        task={buildTask({ title: "Pay rent", dueDate: "2024-05-01" })}
        struck={false}
        overdue
        showRolloverHint={false}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it("does not badge a struck task as overdue, even if it technically is", () => {
    render(
      <TaskItem
        task={buildTask({ title: "Pay rent", dueDate: "2024-05-01" })}
        struck
        overdue
        showRolloverHint={false}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
  });

  it("fires onToggle when the checkbox is clicked, without firing onOpen", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onOpen = vi.fn();

    render(
      <TaskItem
        task={buildTask()}
        struck={false}
        overdue={false}
        showRolloverHint={false}
        onToggle={onToggle}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("fires onOpen when the row body is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    render(
      <TaskItem
        task={buildTask({ title: "Water the plants" })}
        struck={false}
        overdue={false}
        showRolloverHint={false}
        onToggle={vi.fn()}
        onOpen={onOpen}
      />,
    );

    await user.click(screen.getByRole("button", { name: /water the plants/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("disables the checkbox when toggleDisabled is true", () => {
    render(
      <TaskItem
        task={buildTask()}
        struck={false}
        overdue={false}
        showRolloverHint={false}
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        toggleDisabled
      />,
    );

    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the rollover hint with the original created date when showRolloverHint is true", () => {
    render(
      <TaskItem
        task={buildTask({ createdDate: "2024-05-20" })}
        struck={false}
        overdue={false}
        showRolloverHint
        onToggle={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText(/since may 20/i)).toBeInTheDocument();
  });
});
