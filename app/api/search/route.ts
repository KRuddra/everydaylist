import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { searchQuerySchema, searchResponseSchema } from "@/lib/api/schemas";
import { db } from "@/lib/db/client";
import { searchTasksAndComments } from "@/lib/db/queries/search";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `GET /api/search?q=...` — see docs/API_CONTRACT.md #11. Missing/empty `q`
 * returns `[]` with `200`, not an error.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { q } = searchQuerySchema.parse({ q: request.nextUrl.searchParams.get("q") ?? undefined });

    const results = await searchTasksAndComments(db, q);

    return NextResponse.json(searchResponseSchema.parse(results));
  } catch (error) {
    return toErrorResponse(error);
  }
}
