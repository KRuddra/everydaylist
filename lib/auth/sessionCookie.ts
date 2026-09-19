/**
 * Session cookie name/expiry — deliberately zero-dependency (no `lib/config/env`,
 * no `jose`, no Node-only APIs) so both `proxy.ts` (kept minimal on purpose)
 * and `lib/auth/session.ts` (Node runtime, used by route handlers) can import
 * it without pulling anything heavier into the proxy bundle.
 */

/** Name of the httpOnly session cookie carrying the signed JWT. */
export const SESSION_COOKIE_NAME = "eal_session";

/** Session lifetime (~30 days), used for both the JWT's `exp` and the cookie's `Max-Age`. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
