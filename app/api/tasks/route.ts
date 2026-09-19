import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { taskCreateRequestSchema, taskResponseSchema } from "@/lib/api/schemas";
import { env } from "@/lib/config/env";
import { todayInTimeZone } from "@/lib/dates/today";
import { db } from "@/lib/db/client";
import { listComments } from "@/lib/db/queries/comments";
import { mapCommentRow, mapTaskRow } from "@/lib/db/queries/mappers";
import { createTask } from "@/lib/db/queries/tasks";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `POST /api/tasks` — see docs/API_CONTRACT.md #4. Idempotent on `id`: 201
 * for a genuinely new task, 200 (existing, unchanged) for a replayed `id`.
 * `completed` in the response is absolute (`completedDate !== null`), not
 * relative to any day — this is a standalone task response, not a day view
 * (see `mapTaskRow`).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = taskCreateRequestSchema.parse(body);

    const { task, isNew } = await createTask(db, {
      id: input.id,
      category: input.category,
      title: input.title,
      priority: input.priority ?? null,
      dueDate: input.dueDate ?? null,
      createdDate: input.createdDate ?? todayInTimeZone(env.APP_TIMEZONE),
    });

    // A replayed create (`isNew: false`) returns the existing resource as it
    // actually stands — including any comments it's since accrued — rather
    // than assuming a fresh task's empty comment list.
    const comments = isNew ? [] : (await listComments(db, task.id)).map(mapCommentRow);

    const response = taskResponseSchema.parse(mapTaskRow(task, comments));

    return NextResponse.json(response, { status: isNew ? 201 : 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
