import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { noteResponseSchema, noteUpdateRequestSchema } from "@/lib/api/schemas";
import { db } from "@/lib/db/client";
import { getGeneralNote, saveGeneralNote } from "@/lib/db/queries/notes";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `GET /api/notes` — the single persistent general note. Returns an empty body
 * (never a 404) when the note has never been saved, so the editor always has a
 * value to render.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const note = await getGeneralNote(db);
    const response = noteResponseSchema.parse({
      body: note?.body ?? "",
      updatedAt: (note?.updatedAt ?? new Date()).toISOString(),
    });
    return NextResponse.json(response);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `PUT /api/notes` — save the general note (upsert, last-writer-wins). */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = noteUpdateRequestSchema.parse(body);
    const note = await saveGeneralNote(db, input.body);
    const response = noteResponseSchema.parse({
      body: note.body,
      updatedAt: note.updatedAt.toISOString(),
    });
    return NextResponse.json(response);
  } catch (error) {
    return toErrorResponse(error);
  }
}
