// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "@/lib/config/env";
import { RateLimitedError } from "@/lib/errors/errors";

import { checkLoginRateLimit, resetLoginRateLimit } from "./rateLimit";

describe("checkLoginRateLimit", () => {
  beforeEach(() => {
    resetLoginRateLimit();
    env.LOGIN_RATE_LIMIT_MAX = 3;
    env.LOGIN_RATE_LIMIT_WINDOW_MS = 1000;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetLoginRateLimit();
  });

  it("allows attempts up to the configured max within the window", () => {
    expect(() => checkLoginRateLimit("client-a")).not.toThrow();
    expect(() => checkLoginRateLimit("client-a")).not.toThrow();
    expect(() => checkLoginRateLimit("client-a")).not.toThrow();
  });

  it("throws RateLimitedError once the max is exceeded within the window", () => {
    checkLoginRateLimit("client-b");
    checkLoginRateLimit("client-b");
    checkLoginRateLimit("client-b");
    expect(() => checkLoginRateLimit("client-b")).toThrow(RateLimitedError);
  });

  it("tracks separate keys independently", () => {
    checkLoginRateLimit("client-c");
    checkLoginRateLimit("client-c");
    checkLoginRateLimit("client-c");
    // A different key is unaffected by "client-c" being at its limit.
    expect(() => checkLoginRateLimit("client-d")).not.toThrow();
  });

  it("resets the count once the window elapses", () => {
    checkLoginRateLimit("client-e");
    checkLoginRateLimit("client-e");
    checkLoginRateLimit("client-e");
    expect(() => checkLoginRateLimit("client-e")).toThrow(RateLimitedError);

    vi.advanceTimersByTime(1001);

    // A new window has started — the count resets, so this attempt succeeds.
    expect(() => checkLoginRateLimit("client-e")).not.toThrow();
  });

  it("resetLoginRateLimit clears all recorded attempts", () => {
    checkLoginRateLimit("client-f");
    checkLoginRateLimit("client-f");
    checkLoginRateLimit("client-f");
    resetLoginRateLimit();
    expect(() => checkLoginRateLimit("client-f")).not.toThrow();
  });
});
