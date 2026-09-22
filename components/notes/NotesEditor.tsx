"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Textarea } from "@/components/ui/textarea";
import { useNote, useSaveNote } from "@/lib/query/hooks/useNote";

/** How long after the last keystroke to autosave. */
const AUTOSAVE_DELAY_MS = 800;

const TEXTAREA_CLASS = "min-h-[60vh] flex-1 resize-none text-base leading-relaxed";

/**
 * A single, always-there general note. Not dated — one persistent document
 * that autosaves as you type (debounced) and on blur, syncing across devices
 * through the same offline-resilient mutation layer as tasks.
 */
export function NotesEditor() {
  const noteQuery = useNote();

  if (noteQuery.isLoading) {
    return <Textarea disabled aria-label="General notes" placeholder="Loading…" className={TEXTAREA_CLASS} />;
  }

  // Mounts only once the note has loaded, so its `useState` initializer seeds
  // the editor (no set-state-in-effect). It then stays mounted, so a later
  // background refetch never clobbers in-progress edits.
  return <NoteField initialBody={noteQuery.data?.body ?? ""} />;
}

function NoteField({ initialBody }: { initialBody: string }) {
  const saveNote = useSaveNote();
  const [value, setValue] = useState(initialBody);
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending autosave timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function save(next: string) {
    saveNote.mutate({ body: next }, { onSuccess: () => setDirty(false) });
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    setValue(next);
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(next), AUTOSAVE_DELAY_MS);
  }

  function handleBlur() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dirty) save(value);
  }

  const status = saveNote.isPending
    ? "Saving…"
    : saveNote.isError
      ? "Couldn't save — will retry"
      : dirty
        ? "Unsaved changes"
        : "Saved";

  return (
    <div className="flex flex-1 flex-col gap-2">
      <Textarea
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Jot anything here — it stays put and syncs across your devices."
        aria-label="General notes"
        className={TEXTAREA_CLASS}
      />
      <p className="text-right text-xs text-muted-foreground" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
