import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { commentCreateRequestSchema, commentListResponseSchema, commentResponseSchema, uuidSchema } from "@/lib/api/schemas";
import { db } from "@/lib/db/client";
import { createComment, listComments } from "@/lib/db/queries/comments";
import { mapCommentRow } from "@/lib/db/queries/mappers";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `POST /api/tasks/[id]/comments` — see docs/API_CONTRACT.md #7. Idempotent
 * on `id` (same semantics as task creation): 201 for a new comment, 200
 * (existing, unchanged) for a replayed `id`. `404 TASK_NOT_FOUND` if the
 * parent task (route param, not body) doesn't exist.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]/comments">,
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const taskId = uuidSchema.parse(id);

    const body: unknown = await request.json();
    const input = commentCreateRequestSchema.parse(body);

    const { comment, isNew } = await createComment(db, taskId, input);

    return NextResponse.json(commentResponseSchema.parse(mapCommentRow(comment)), {
      status: isNew ? 201 : 200,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `GET /api/tasks/[id]/comments` — see docs/API_CONTRACT.md #8. All comments for the task, oldest first. */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]/comments">,
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const taskId = uuidSchema.parse(id);

    const comments = await listComments(db, taskId);

    return NextResponse.json(commentListResponseSchema.parse(comments.map(mapCommentRow)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
