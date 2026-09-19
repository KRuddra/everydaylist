import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { statsQuerySchema, statsResponseSchema } from "@/lib/api/schemas";
import { env } from "@/lib/config/env";
import { todayInTimeZone } from "@/lib/dates/today";
import { db } from "@/lib/db/client";
import { getCompletionDays, getStatsDayRows } from "@/lib/db/queries/stats";
import { toErrorResponse } from "@/lib/errors/httpError";
import { buildStatsResponse } from "@/lib/stats/buildStatsResponse";

/**
 * `GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` — see docs/API_CONTRACT.md
 * #10. `days` is bounded to `[from, to]`; `currentStreak`/`longestStreak`
 * are computed over the entire task history (see `getCompletionDays`).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { from, to } = statsQuerySchema.parse({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
    });

    const [dayRows, completionDays] = await Promise.all([
      getStatsDayRows(db, from, to),
      getCompletionDays(db),
    ]);

    const today = todayInTimeZone(env.APP_TIMEZONE);
    const response = buildStatsResponse(dayRows, completionDays, today);

    return NextResponse.json(statsResponseSchema.parse(response));
  } catch (error) {
    return toErrorResponse(error);
  }
}
