import { expect, test } from "@playwright/test";

import { addDays, uniqueSuffix } from "./utils/dates";
import { login, requireLiveEnvironment } from "./utils/env";
import { escapeRegExp } from "./utils/text";

/**
 * T7.9 — browse past days + rollover verification, driven entirely through
 * the real UI/API (no direct DB seeding). Picks `D = today - 3` so the whole
 * D..D+3 walk stays within the Day screen's supported "up to today, never
 * the future" browsing range (see `DayNavigator`'s `canGoForward`).
 */
test.describe("browse past days + rollover", () => {
  test.beforeEach(() => {
    requireLiveEnvironment();
  });

  test("a task created on day D still shows open on D+2, then disappears once completed as of D+3", async ({
    page,
  }) => {
    await login(page);

    // Read "today" (in the app's configured timezone) straight from the UI
    // rather than recomputing it locally, so this never drifts from
    // whatever `APP_TIMEZONE`/`NEXT_PUBLIC_APP_TIMEZONE` the target
    // deployment is actually configured with.
    const historyHref = await page.getByRole("link", { name: "History" }).getAttribute("href");
    const today = historyHref?.replace("/day/", "") ?? "";
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const dayD = addDays(today, -3);
    const dayD2 = addDays(today, -1); // D+2
    const dayD3 = today; // D+3

    const title = `Rollover task ${uniqueSuffix()}`;
    const titlePattern = new RegExp(escapeRegExp(title));
    const checkboxPattern = new RegExp(`Mark "${escapeRegExp(title)}"`);
    const remindersSection = page.getByRole("region", { name: "Reminders" });

    // Create the task on day D.
    await page.goto(`/day/${dayD}`);
    await remindersSection.getByRole("button", { name: "Add task" }).click();
    await page.getByRole("textbox", { name: "New task title" }).fill(title);
    await page.getByRole("textbox", { name: "New task title" }).press("Enter");
    await expect(remindersSection.getByRole("button", { name: titlePattern })).toBeVisible();

    // D+2: still open (rolled over).
    await page.goto(`/day/${dayD2}`);
    const rowOnD2 = remindersSection.getByRole("button", { name: titlePattern });
    await expect(rowOnD2).toBeVisible();
    const checkboxOnD2 = remindersSection.getByRole("checkbox", { name: checkboxPattern });
    await expect(checkboxOnD2).not.toBeChecked();

    // Complete it, as of D+2 (not "today").
    await checkboxOnD2.click();
    await expect(checkboxOnD2).toBeChecked();

    // D+3 (today): the task has scrolled out of the rolling view entirely.
    await page.goto(`/day/${dayD3}`);
    await expect(remindersSection.getByRole("button", { name: titlePattern })).not.toBeVisible();
  });
});
