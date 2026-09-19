import { test, type Page } from "@playwright/test";

/**
 * Every spec in this directory other than `smoke.spec.ts` exercises real
 * login plus task/comment/stats/export behavior against a live app backed by
 * a live, migrated, seeded Postgres database (`DATABASE_URL`) — not
 * available in every environment `pnpm test:e2e` might run in (in
 * particular: not available in the sandbox this suite was originally
 * authored in). Rather than fail the whole run with confusing
 * timeouts/500s/webServer-boot errors when that's missing, every such spec
 * calls `requireLiveEnvironment()` as its first line and skips (not fails)
 * cleanly when the opt-in env vars below aren't set.
 *
 * Opt in by setting, before running `pnpm test:e2e` (e.g. in `.env.local` or
 * the shell):
 * - `E2E_BASE_URL`     — e.g. "http://localhost:3000". Must point at an app
 *                         instance that is actually up and backed by a real,
 *                         migrated `DATABASE_URL` (see docs/DB_RUNBOOK.md).
 *                         `playwright.config.ts`'s own `use.baseURL` already
 *                         defaults to this same address, but it's required
 *                         here explicitly too, as the deliberate "I have a
 *                         real environment" signal — its mere presence in
 *                         `playwright.config.ts` doesn't imply the target is
 *                         actually reachable/seeded.
 * - `E2E_APP_PASSWORD` — the real plaintext password matching the target
 *                         deployment's `APP_PASSWORD_HASH`, so `login()`
 *                         below can actually authenticate.
 */
export function requireLiveEnvironment(): void {
  test.skip(
    !process.env.E2E_BASE_URL || !process.env.E2E_APP_PASSWORD,
    "Requires a live app + seeded database: set E2E_BASE_URL and E2E_APP_PASSWORD to run this spec " +
      "(see e2e/utils/env.ts). Skipped, not failed, so pnpm test:e2e stays green without a live Neon DB.",
  );
}

/** Logs in via the real login form and waits for the redirect to Today. */
export async function login(page: Page, password: string = process.env.E2E_APP_PASSWORD ?? ""): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("/");
}
