import { eq } from "drizzle-orm";

import type { AppDatabase } from "@/lib/db/client";
import { notes, type NoteRow } from "@/lib/db/schema";

/** The single global note lives under this fixed id (the `notes` table has one row). */
export const GENERAL_NOTE_ID = "general";

/** Reads the general note, or `undefined` if it has never been saved. */
export async function getGeneralNote(db: AppDatabase): Promise<NoteRow | undefined> {
  const rows = await db.select().from(notes).where(eq(notes.id, GENERAL_NOTE_ID)).limit(1);
  return rows[0];
}

/**
 * Upserts the general note's body in a single statement (last-writer-wins).
 * Returns the stored row, including its refreshed `updatedAt`.
 */
export async function saveGeneralNote(db: AppDatabase, body: string): Promise<NoteRow> {
  const now = new Date();
  const rows = await db
    .insert(notes)
    .values({ id: GENERAL_NOTE_ID, body, updatedAt: now })
    .onConflictDoUpdate({ target: notes.id, set: { body, updatedAt: now } })
    .returning();
  return rows[0];
}
