import { expect, test } from "@playwright/test";

import { login, requireLiveEnvironment } from "./utils/env";
import { uniqueSuffix } from "./utils/dates";
import { escapeRegExp } from "./utils/text";

/**
 * T7.8 — full flow from Today through to a struck, commented task that
 * survives a reload (proves it round-tripped through the real API, not just
 * the optimistic cache).
 */
test.describe("add / complete / comment on a task", () => {
  test.beforeEach(() => {
    requireLiveEnvironment();
  });

  test("add, complete, and comment on a task, then confirm it persists after reload", async ({ page }) => {
    await login(page);

    const title = `E2E task ${uniqueSuffix()}`;
    const titlePattern = new RegExp(escapeRegExp(title));
    // The checkbox's accessible name flips between "as done"/"as not done"
    // depending on completion state — match only the stable title portion.
    const checkboxPattern = new RegExp(`Mark "${escapeRegExp(title)}"`);
    const remindersSection = page.getByRole("region", { name: "Reminders" });

    await remindersSection.getByRole("button", { name: "Add task" }).click();
    await page.getByRole("textbox", { name: "New task title" }).fill(title);
    await page.getByRole("textbox", { name: "New task title" }).press("Enter");

    const taskRow = remindersSection.getByRole("button", { name: titlePattern });
    await expect(taskRow).toBeVisible();

    // Complete it.
    const checkbox = remindersSection.getByRole("checkbox", { name: checkboxPattern });
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Open it and add a comment.
    await taskRow.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: title })).toBeVisible();

    const commentBody = `Comment ${uniqueSuffix()}`;
    await dialog.getByRole("textbox", { name: "New comment" }).fill(commentBody);
    await dialog.getByRole("button", { name: "Post comment" }).click();
    await expect(dialog.getByText(commentBody)).toBeVisible();

    await page.keyboard.press("Escape");

    // Reload — everything above must have actually reached the server, not
    // just the optimistic client cache.
    await page.reload();

    const reloadedRow = remindersSection.getByRole("button", { name: titlePattern });
    await expect(reloadedRow).toBeVisible();
    await expect(remindersSection.getByRole("checkbox", { name: checkboxPattern })).toBeChecked();

    await reloadedRow.click();
    await expect(page.getByRole("dialog").getByText(commentBody)).toBeVisible();
  });
});
