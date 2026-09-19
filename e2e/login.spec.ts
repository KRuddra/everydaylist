import { expect, test } from "@playwright/test";

import { login, requireLiveEnvironment } from "./utils/env";

/**
 * T7.7 — login flow. Requires a live app + a live `DATABASE_URL` (the login
 * route's rate limiter is in-memory, but password verification and the
 * subsequent session cookie both depend on real server config) — see
 * `e2e/utils/env.ts`. Serial: the rate-limit test deliberately exhausts the
 * shared in-memory limiter, so it must run *after* the tests that need a
 * clean rate-limit window, not interleaved with them.
 */
test.describe.serial("login", () => {
  test.beforeEach(() => {
    requireLiveEnvironment();
  });

  test("correct password redirects to Today", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  });

  test("wrong password shows an inline error and does not redirect", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Password", { exact: true }).fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Unlock" }).click();

    await expect(page.getByRole("alert")).toContainText(/incorrect password/i);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });

  test("exceeding the rate limit shows the lockout state and disables submit", async ({ page }) => {
    await page.goto("/login");
    const passwordField = page.getByLabel("Password", { exact: true });
    const submitButton = page.getByRole("button", { name: "Unlock" });

    // The exact configured max isn't known to this spec (it's server-side
    // config, `LOGIN_RATE_LIMIT_MAX`) — keep submitting wrong passwords
    // until the lockout UI appears, with a generous upper bound so a
    // misconfigured/very-high limit fails loudly instead of hanging.
    const MAX_ATTEMPTS = 30;
    let locked = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !locked; attempt += 1) {
      await passwordField.fill(`wrong-password-${attempt}`);
      await submitButton.click();
      await Promise.race([
        page.getByText(/too many attempts/i).waitFor({ state: "visible", timeout: 2000 }).catch(() => undefined),
        page.getByRole("alert").waitFor({ state: "visible", timeout: 2000 }).catch(() => undefined),
      ]);
      locked = await page.getByText(/too many attempts/i).isVisible();
    }

    expect(locked).toBe(true);
    await expect(submitButton).toBeDisabled();
  });
});
