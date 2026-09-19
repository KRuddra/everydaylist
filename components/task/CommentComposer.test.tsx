import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CommentComposer } from "./CommentComposer";

describe("CommentComposer", () => {
  it("calls onSubmit with the trimmed body and clears the textarea", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentComposer onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox", { name: /new comment/i });
    await user.type(textarea, "  Waiting on a reply.  ");
    await user.click(screen.getByRole("button", { name: /post comment/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("Waiting on a reply.");
    expect(textarea).toHaveValue("");
  });

  it("does not call onSubmit for an empty (or whitespace-only) comment", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentComposer onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox", { name: /new comment/i });
    await user.type(textarea, "   ");
    // The submit button is disabled for a whitespace-only body — clicking it does nothing.
    expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /post comment/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the textarea and submit button when disabled is true", () => {
    render(<CommentComposer onSubmit={vi.fn()} disabled />);

    expect(screen.getByRole("textbox", { name: /new comment/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /post comment/i })).toBeDisabled();
  });

  it("keeps the submit button disabled until non-whitespace text is entered", async () => {
    const user = userEvent.setup();
    render(<CommentComposer onSubmit={vi.fn()} />);

    const button = screen.getByRole("button", { name: /post comment/i });
    expect(button).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: /new comment/i }), "a");
    expect(button).toBeEnabled();
  });
});
