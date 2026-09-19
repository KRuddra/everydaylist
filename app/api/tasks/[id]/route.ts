import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { taskDeleteResponseSchema, taskPatchRequestSchema, taskResponseSchema, uuidSchema } from "@/lib/api/schemas";
import { db } from "@/lib/db/client";
import { listComments } from "@/lib/db/queries/comments";
import { mapCommentRow, mapTaskRow } from "@/lib/db/queries/mappers";
import { deleteTask, patchTask } from "@/lib/db/queries/tasks";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `PATCH /api/tasks/[id]` — see docs/API_CONTRACT.md #5. Combines field
 * edits and/or a completion action; `taskPatchRequestSchema` already
 * enforces "at least one of them present". `completed` in the response is
 * absolute, not relative to any day (standalone task response — see
 * `mapTaskRow`).
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">,
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const taskId = uuidSchema.parse(id);

    const body: unknown = await request.json();
    const { completion, ...fields } = taskPatchRequestSchema.parse(body);

    const task = await patchTask(db, taskId, fields, completion);
    const comments = (await listComments(db, taskId)).map(mapCommentRow);

    return NextResponse.json(taskResponseSchema.parse(mapTaskRow(task, comments)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `DELETE /api/tasks/[id]` — see docs/API_CONTRACT.md #6. Not idempotent-on-replay: a second delete is `404`. */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">,
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const taskId = uuidSchema.parse(id);

    await deleteTask(db, taskId);

    return NextResponse.json(taskDeleteResponseSchema.parse({ success: true }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
