import { NotesEditor } from "@/components/notes/NotesEditor";

/** Notes (`/notes`) — a single persistent, non-dated general note. */
export default function NotesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <h2 className="text-[28px] leading-9 font-bold tracking-tight">Notes</h2>
      <NotesEditor />
    </div>
  );
}
