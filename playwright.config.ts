import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config.
 *
 * The dev server is started automatically. Offline / service-worker specs need
 * a production build (`next build --webpack && next start`); set
 * `E2E_PROD=1` to run against that instead of the Turbopack dev server.
 */
const useProd = process.env.E2E_PROD === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: useProd ? "pnpm build && pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
