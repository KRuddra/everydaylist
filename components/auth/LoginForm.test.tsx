import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { LoginForm } from "./LoginForm";

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("LoginForm", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the invalid-password alert and marks the field invalid on a 401 response", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "INVALID_CREDENTIALS", message: "Incorrect password." } }, 401),
    );

    renderWithQueryClient(<LoginForm />);

    await user.type(screen.getByLabelText(/^password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /unlock/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/incorrect password/i);
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("aria-invalid", "true");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to Today on a successful login", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ success: true }, 200));

    renderWithQueryClient(<LoginForm />);

    await user.type(screen.getByLabelText(/^password$/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("disables the submit button and shows the lockout state on a 429 rate-limit response", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "RATE_LIMITED", message: "Too many login attempts." } }, 429),
    );

    renderWithQueryClient(<LoginForm />);

    await user.type(screen.getByLabelText(/^password$/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /unlock/i })).toBeDisabled());
    expect(screen.getByText(/too many attempts/i)).toBeInTheDocument();
  });
});
