import { env } from "@/lib/config/env";
import { RateLimitedError } from "@/lib/errors/errors";

interface WindowState {
  count: number;
  windowStart: number;
}

/**
 * In-process fixed-window rate limiter for `POST /api/auth/login`, keyed by
 * client (see `getClientKey` in the route handler). An in-memory `Map` is
 * fine for this single-user app running as a single server process; it does
 * NOT survive a process restart and does NOT coordinate across multiple
 * server instances — a durable store (e.g. Redis) would be required if this
 * were ever deployed behind multiple instances/edge regions.
 */
const attemptsByKey = new Map<string, WindowState>();

/** Records a login attempt for `key`; throws `RateLimitedError` if the window's limit is exceeded. */
export function checkLoginRateLimit(key: string): void {
  const now = Date.now();
  const state = attemptsByKey.get(key);

  if (!state || now - state.windowStart >= env.LOGIN_RATE_LIMIT_WINDOW_MS) {
    attemptsByKey.set(key, { count: 1, windowStart: now });
    return;
  }

  if (state.count >= env.LOGIN_RATE_LIMIT_MAX) {
    throw new RateLimitedError();
  }

  state.count += 1;
}

/** Test-only: clears all recorded attempts so specs don't leak state between runs. */
export function resetLoginRateLimit(): void {
  attemptsByKey.clear();
}
