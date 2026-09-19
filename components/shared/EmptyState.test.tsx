import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title and description for the default 'empty' variant, without an alert role", () => {
    render(<EmptyState title="No tasks yet" description="Add your first task to get started." />);

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first task to get started.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders with role=alert for the 'error' variant", () => {
    render(<EmptyState variant="error" title="Couldn't load tasks" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load tasks");
  });

  it("does not render a description when none is given", () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it("does not render a Retry button when onRetry is not provided", () => {
    render(<EmptyState title="No results" />);
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("renders a Retry button that calls onRetry when clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<EmptyState variant="error" title="Couldn't load tasks" onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
