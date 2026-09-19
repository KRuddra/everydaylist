import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { uniqueSuffix } from "./utils/dates";
import { login, requireLiveEnvironment } from "./utils/env";
import { escapeRegExp } from "./utils/text";

/**
 * T7.11 — the one-tap JSON backup export downloads a valid, complete file that
 * contains the user's tasks. Guarded like the other specs: skips cleanly when
 * no live app + seeded database is available (see e2e/utils/env.ts).
 */
test.describe("export backup", () => {
  test.beforeEach(() => {
    requireLiveEnvironment();
  });

  test("downloads a valid JSON backup containing the user's tasks", async ({ page }) => {
    await login(page);

    // Seed a recognizable task so we can assert it appears in the export.
    const title = `Export task ${uniqueSuffix()}`;
    const titlePattern = new RegExp(escapeRegExp(title));
    const remindersSection = page.getByRole("region", { name: "Reminders" });

    await remindersSection.getByRole("button", { name: "Add task" }).click();
    await page.getByRole("textbox", { name: "New task title" }).fill(title);
    await page.getByRole("textbox", { name: "New task title" }).press("Enter");
    await expect(remindersSection.getByRole("button", { name: titlePattern })).toBeVisible();

    // One-tap export from the header.
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export backup" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.json$/);

    const filePath = await download.path();
    const parsed = JSON.parse(await readFile(filePath, "utf-8"));

    expect(parsed).toHaveProperty("exportedAt");
    expect(Array.isArray(parsed.tasks)).toBe(true);
    const titles = parsed.tasks.map((task: { title: string }) => task.title);
    expect(titles).toContain(title);
  });
});
