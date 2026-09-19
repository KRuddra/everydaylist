import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * `lib/config/env.ts`/`lib/config/clientEnv.ts` are Zod-validated and fail
 * fast at *import* time (see those modules' docstrings) — several unit/
 * component test files import modules that transitively pull one or both of
 * them in (`lib/auth/*`, `lib/db/client.ts`, `lib/query/optimistic.ts`, ...).
 * These are the same non-secret placeholder values `.github/workflows/ci.yml`
 * sets for CI, defined once here so every test file gets a working `env`/
 * `clientEnv` without each one having to stub `process.env` itself.
 * Real secrets are never read here — see the userEmail/global-instructions
 * rule against reading real secrets from test code.
 */
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/db?sslmode=disable";
process.env.AUTH_SECRET ??= "vitest-placeholder-secret-value-at-least-32-chars-long";
process.env.APP_PASSWORD_HASH ??= "$2a$12$vitest.placeholder.hash.value.for.unit.tests.only.0000";
process.env.APP_TIMEZONE ??= "America/Toronto";
process.env.NEXT_PUBLIC_APP_TIMEZONE ??= "America/Toronto";
process.env.LOGIN_RATE_LIMIT_MAX ??= "5";
process.env.LOGIN_RATE_LIMIT_WINDOW_MS ??= "900000";

// Unmount React trees between tests to avoid cross-test DOM leakage.
afterEach(() => {
  cleanup();
});

/**
 * jsdom polyfills/mocks needed by Base UI (`@base-ui/react/*`, used by
 * `components/ui/checkbox.tsx`, `tabs.tsx`, `dialog.tsx`, `popover.tsx`,
 * `calendar.tsx`) and by a couple of app components — jsdom implements none
 * of these. Installed unconditionally (not feature-detected) so behavior is
 * identical across every test file/run.
 *
 * Guarded by `typeof window !== "undefined"`: some test files (e.g. the
 * pglite DB integration tests) opt into `// @vitest-environment node`, where
 * there is no `window`/`Element` at all — this setup file still runs for
 * them, so it must not assume a DOM is present.
 */
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserver {
      root = null;
      rootMargin = "";
      thresholds: ReadonlyArray<number> = [];
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    } as unknown as typeof window.IntersectionObserver;
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // Pointer-capture APIs: used by Base UI's Checkbox/Slider/etc. pointer
  // handling; jsdom has `PointerEvent` but no pointer-capture methods at all.
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
}

// `crypto.randomUUID` — present in this project's Node/jsdom versions today,
// but polyfilled defensively per the Stage 7 brief in case that ever regresses.
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: { ...globalThis.crypto, randomUUID: () => "00000000-0000-4000-8000-000000000000" },
    configurable: true,
  });
}
