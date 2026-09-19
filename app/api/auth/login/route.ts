import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { loginRequestSchema, loginResponseSchema } from "@/lib/api/schemas";
import { verifyPassword } from "@/lib/auth/password";
import { checkLoginRateLimit } from "@/lib/auth/rateLimit";
import { issueSessionToken, sessionCookieAttributes } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/sessionCookie";
import { toErrorResponse } from "@/lib/errors/httpError";

/**
 * Best-effort client identity for rate-limit keying. This is a single-user
 * app behind (at most) one browser at a time, so a coarse per-IP key is
 * sufficient — see `lib/auth/rateLimit.ts` for the limiter itself.
 */
function getClientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** `POST /api/auth/login` — see docs/API_CONTRACT.md #1. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    checkLoginRateLimit(getClientKey(request));

    const body: unknown = await request.json();
    const { password } = loginRequestSchema.parse(body);

    await verifyPassword(password);

    const token = await issueSessionToken();
    const response = NextResponse.json(loginResponseSchema.parse({ success: true }));
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      ...sessionCookieAttributes,
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
