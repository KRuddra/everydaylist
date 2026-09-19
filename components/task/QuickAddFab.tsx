"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskComposer } from "@/components/task/TaskComposer";

interface QuickAddFabProps {
  /** The new task's `createdDate` — Today's date on the Today page, the browsed date on the Day page. */
  targetDate: string;
}

/**
 * Floating action button opening `TaskComposer` (dialog mode, with a
 * category `Tabs` selector) — the secondary/convenience add-task path for
 * when the user has scrolled past the target `CategorySection`
 * (`docs/UI_SPEC.md` §2.1). Present on Today and Day only.
 */
export function QuickAddFab({ targetDate }: QuickAddFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="icon-lg"
        aria-label="Add task"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-30 size-14 rounded-full shadow-lg md:right-8"
      >
        <Plus className="size-6" aria-hidden="true" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
        </DialogHeader>
        <TaskComposer mode="dialog" targetDate={targetDate} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
