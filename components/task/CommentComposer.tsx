"use client";

import { useState, type FormEvent } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentComposerProps {
  onSubmit: (body: string) => void;
  /** Never tied to offline status — comments are one of the six offline-outbox actions and queue safely; only used to disable while, e.g., the parent task hasn't resolved yet. */
  disabled?: boolean;
}

/**
 * Add-comment input, pinned to the bottom of `TaskDetailDialog`. Submits via
 * an explicit `Button`, not `Enter`, since the `Textarea` needs multi-line
 * `Enter` (`docs/UI_SPEC.md` §6).
 */
export function CommentComposer({ onSubmit, disabled }: CommentComposerProps) {
  const [body, setBody] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border pt-3">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Add a comment…"
        aria-label="New comment"
        disabled={disabled}
        className="min-h-9 flex-1"
        rows={1}
      />
      <Button type="submit" size="icon" aria-label="Post comment" disabled={disabled || body.trim().length === 0}>
        <SendHorizontal className="size-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
