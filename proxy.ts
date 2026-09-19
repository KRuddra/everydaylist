import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/sessionCookie";

/**
 * Auth gate for every non-excluded route (see `config.matcher` below).
 *
 * Deliberately minimal: only `jose` + `next/server` + the zero-dependency
 * `SESSION_COOKIE_NAME` constant. No `bcryptjs`, no `lib/db/*`, no
 * `lib/config/env.ts` — `AUTH_SECRET` is read directly from `process.env`
 * here rather than through the shared env loader, so this file stays free of
 * anything heavier than a JWT *signature/expiry* check. This is an
 * optimistic check only (see the Next.js Authentication guide's "Optimistic
 * checks with Proxy"); it never touches the database.
 */
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/** The one `/api/*` route reachable without a session — see docs/API_CONTRACT.md. */
const UNAUTHENTICATED_API_ROUTES = new Set(["/api/auth/login"]);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute && UNAUTHENTICATED_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  if (await hasValidSession(request)) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    /*
     * Run on every route except:
     * - /login                    (the public login page itself)
     * - /_next/*                  (framework internals/static assets)
     * - /sw.js                    (service worker script — must load unauthenticated)
     * - /manifest.webmanifest     (PWA manifest — must load unauthenticated)
     * - /favicon.ico              (browser-requested automatically, unauthenticated)
     * `POST /api/auth/login` is NOT excluded here — it's still matched (so
     * static assets under /api are still gated) and explicitly passed
     * through inside `proxy()` above via `UNAUTHENTICATED_API_ROUTES`.
     */
    "/((?!login$|_next/|sw\\.js$|manifest\\.webmanifest$|favicon\\.ico$).*)",
  ],
};
