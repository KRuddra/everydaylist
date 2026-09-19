import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/lib/config/env";

import { SESSION_MAX_AGE_SECONDS } from "./sessionCookie";

const encodedSecret = new TextEncoder().encode(env.AUTH_SECRET);

/** Minimal session claim. Single shared password, so there's no per-user id to carry. */
interface SessionPayload extends JWTPayload {
  authenticated: true;
}

/** Issues a signed session JWT (HS256), valid for `SESSION_MAX_AGE_SECONDS`. */
export async function issueSessionToken(): Promise<string> {
  const payload: SessionPayload = { authenticated: true };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(encodedSecret);
}

/** Verifies a session JWT's signature, expiry, and shape. Never throws — returns `false` on any failure. */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret, { algorithms: ["HS256"] });
    return (payload as Partial<SessionPayload>).authenticated === true;
  } catch {
    return false;
  }
}

/**
 * Cookie attributes shared by every place the session cookie is set or
 * cleared (login sets it, logout clears it). `maxAge` is passed separately
 * by each call site (login uses `SESSION_MAX_AGE_SECONDS`; logout uses `0`).
 */
export const sessionCookieAttributes = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
