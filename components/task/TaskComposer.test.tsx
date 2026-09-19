import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerMutationDefaults } from "@/lib/query/registerMutationDefaults";

import { TaskComposer } from "./TaskComposer";

/**
 * `useCreateTask` (via `lib/query/hooks/useTaskMutations.ts`) only supplies a
 * `mutationKey` — its `mutationFn`/optimistic handlers are registered
 * separately by `registerMutationDefaults` (see `app/Providers.tsx`), so
 * every test needs a `QueryClient` with those defaults registered, exactly
 * like the real app.
 */
function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  registerMutationDefaults(queryClient);
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function buildTaskResponse(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "0e6a6f2a-2f2a-4f2a-8f2a-2f2a4f2a8f2a",
    category: "reminders",
    title: "New task",
    priority: null,
    dueDate: null,
    createdDate: "2024-06-15",
    completedDate: null,
    completed: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    comments: [],
    ...overrides,
  };
}

describe("TaskComposer", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an empty title: does not create a task, still calls onDone", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();

    renderWithQueryClient(<TaskComposer mode="inline" targetDate="2024-06-15" onDone={onDone} />);

    // Submit via Enter with no text typed at all.
    const input = screen.getByRole("textbox", { name: /new task title/i });
    await user.type(input, "{Enter}");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("rejects a whitespace-only title without creating a task", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();

    renderWithQueryClient(<TaskComposer mode="inline" targetDate="2024-06-15" onDone={onDone} />);

    const input = screen.getByRole("textbox", { name: /new task title/i });
    await user.type(input, "   {Enter}");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("submits a valid title: posts to /api/tasks with the trimmed title and targetDate, then calls onDone", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(buildTaskResponse({ title: "Buy milk", createdDate: "2024-06-15" })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithQueryClient(
      <TaskComposer mode="dialog" targetDate="2024-06-15" defaultCategory="reminders" onDone={onDone} />,
    );

    const input = screen.getByRole("textbox", { name: /new task title/i });
    await user.type(input, "  Buy milk  ");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tasks");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string) as { title: string; createdDate: string; category: string };
    expect(body.title).toBe("Buy milk");
    expect(body.createdDate).toBe("2024-06-15");
    expect(body.category).toBe("reminders");

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("clears the input after a successful submit", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(buildTaskResponse({ title: "Buy milk" })), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithQueryClient(<TaskComposer mode="dialog" targetDate="2024-06-15" onDone={vi.fn()} />);

    const input = screen.getByRole("textbox", { name: /new task title/i }) as HTMLInputElement;
    await user.type(input, "Buy milk");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(input.value).toBe("");
  });

  it("cancels on Escape without creating a task", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    renderWithQueryClient(<TaskComposer mode="inline" targetDate="2024-06-15" onDone={onDone} />);

    const input = screen.getByRole("textbox", { name: /new task title/i });
    await user.type(input, "Half-typed idea");
    await user.keyboard("{Escape}");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
