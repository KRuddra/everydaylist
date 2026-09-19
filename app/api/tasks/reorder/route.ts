import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { taskReorderRequestSchema, taskReorderResponseSchema } from "@/lib/api/schemas";
import { db } from "@/lib/db/client";
import { reorderTasks } from "@/lib/db/queries/tasks";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `POST /api/tasks/reorder` — see docs/API_CONTRACT.md #9. Scoped to a
 * single category per request; `404 TASK_NOT_FOUND` if any `id` in `items`
 * doesn't belong to `category`. Naturally idempotent, so no replay handling
 * is needed.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const { category, items } = taskReorderRequestSchema.parse(body);

    await reorderTasks(db, category, items);

    return NextResponse.json(taskReorderResponseSchema.parse({ success: true }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
