"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, type CategorySlug } from "@/lib/config/categories";
import { useCreateTask } from "@/lib/query/hooks/useTaskMutations";

interface TaskComposerProps {
  /** `"inline"`: per-category row, `Enter` submits, blur-empty/`Escape` cancels. `"dialog"`: inside `QuickAddFab`'s `Dialog`, with a category `Tabs` selector and an explicit submit `Button`. */
  mode: "inline" | "dialog";
  /** The new task's `createdDate` — always explicit (Today's date or the viewed Day's date), never left to the server default, so the optimistic insert targets the right cached day. */
  targetDate: string;
  defaultCategory?: CategorySlug;
  onDone: () => void;
}

/** Add-task input — the single component behind both add-task entry points (`docs/UI_SPEC.md` §2.1). */
export function TaskComposer({ mode, targetDate, defaultCategory, onDone }: TaskComposerProps) {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategorySlug>(defaultCategory ?? CATEGORIES[0].slug);

  function submit() {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      onDone();
      return;
    }
    createTask.mutate({
      id: crypto.randomUUID(),
      category,
      title: trimmed,
      createdDate: targetDate,
    });
    setTitle("");
    onDone();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setTitle("");
      onDone();
    }
  }

  function handleBlur() {
    if (mode === "inline" && title.trim().length === 0) {
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-1 py-1">
      {mode === "dialog" ? (
        <Tabs value={category} onValueChange={(value) => setCategory(value as CategorySlug)}>
          <TabsList className="w-full">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.slug} value={c.slug} className="flex-1">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          placeholder="Add a task…"
          aria-label="New task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={createTask.isPending}
        />
        {mode === "dialog" ? (
          <Button type="submit" disabled={createTask.isPending || title.trim().length === 0}>
            {createTask.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Add"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
