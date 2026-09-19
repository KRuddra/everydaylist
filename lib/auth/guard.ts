import { cookies } from "next/headers";

import { UnauthorizedError } from "@/lib/errors/errors";

import { verifySessionToken } from "./session";
import { SESSION_COOKIE_NAME } from "./sessionCookie";

/**
 * Reads and verifies the session cookie for the current request, throwing
 * `UnauthorizedError` if it's missing/invalid/expired.
 *
 * `proxy.ts` already rejects unauthenticated `/api/*` requests (except
 * `POST /api/auth/login`) before they reach a route handler — see
 * `docs/API_CONTRACT.md` ("individual routes don't re-implement that check")
 * — so route handlers do not need to call this for authorization. It exists
 * for any other server code that wants to read/confirm the session directly
 * (e.g. a future Server Component or Server Action added in Stage 6).
 */
export async function requireSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token || !(await verifySessionToken(token))) {
    throw new UnauthorizedError();
  }
}
