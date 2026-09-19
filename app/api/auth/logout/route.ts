import { NextResponse } from "next/server";

import { logoutResponseSchema } from "@/lib/api/schemas";
import { sessionCookieAttributes } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * `POST /api/auth/logout` — see docs/API_CONTRACT.md #2. Auth is enforced by
 * `proxy.ts` (every route except login requires a valid session), so this
 * handler only needs to clear the cookie.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const response = NextResponse.json(logoutResponseSchema.parse({ success: true }));
    response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieAttributes, maxAge: 0 });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
