import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { calendarDateSchema, dayViewResponseSchema } from "@/lib/api/schemas";
import { db } from "@/lib/db/client";
import { getDayView } from "@/lib/db/queries/tasks";
import { toErrorResponse } from "@/lib/errors/httpError";

/** `GET /api/days/[date]` — see docs/API_CONTRACT.md #3. */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/days/[date]">,
): Promise<NextResponse> {
  try {
    const { date: rawDate } = await ctx.params;
    const date = calendarDateSchema.parse(rawDate);

    const tasksForDay = await getDayView(db, date);

    return NextResponse.json(dayViewResponseSchema.parse({ date, tasks: tasksForDay }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
