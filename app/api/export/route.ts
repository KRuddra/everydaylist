import { NextResponse } from "next/server";

import { exportResponseSchema } from "@/lib/api/schemas";
import { env } from "@/lib/config/env";
import { todayInTimeZone } from "@/lib/dates/today";
import { db } from "@/lib/db/client";
import { getExportTasks } from "@/lib/db/queries/export";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `GET /api/export` — see docs/API_CONTRACT.md #12. A full JSON backup,
 * served with `Content-Disposition: attachment` so the browser downloads it
 * directly rather than rendering it.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const tasks = await getExportTasks(db);
    const exportedAt = new Date().toISOString();

    const response = NextResponse.json(exportResponseSchema.parse({ exportedAt, tasks }));
    const filenameDate = todayInTimeZone(env.APP_TIMEZONE);
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="everydaylist-export-${filenameDate}.json"`,
    );
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
