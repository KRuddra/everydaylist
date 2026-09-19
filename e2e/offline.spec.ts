import { expect, test } from "@playwright/test";

import { uniqueSuffix } from "./utils/dates";
import { login, requireLiveEnvironment } from "./utils/env";
import { escapeRegExp } from "./utils/text";

/**
 * T7.10 — offline mode + outbox replay. Creates and completes a task while
 * the browser context is offline (both queue into the IndexedDB-backed
 * outbox and update the UI optimistically, per T6.11), then goes back
 * online and confirms both actions actually reached the server (survive a
 * reload) rather than only ever having existed in the optimistic cache.
 */
test.describe("offline mode + outbox replay", () => {
  test.beforeEach(() => {
    requireLiveEnvironment();
  });

  test("a create+complete performed while offline persists after reconnecting and reloading", async ({
    page,
    context,
  }) => {
    await login(page);

    const title = `Offline task ${uniqueSuffix()}`;
    const titlePattern = new RegExp(escapeRegExp(title));
    const checkboxPattern = new RegExp(`Mark "${escapeRegExp(title)}"`);
    const remindersSection = page.getByRole("region", { name: "Reminders" });

    await context.setOffline(true);
    await expect(page.getByText(/offline/i).first()).toBeVisible();

    // Create while offline — optimistic insert, no network request succeeds.
    await remindersSection.getByRole("button", { name: "Add task" }).click();
    await page.getByRole("textbox", { name: "New task title" }).fill(title);
    await page.getByRole("textbox", { name: "New task title" }).press("Enter");

    const taskRow = remindersSection.getByRole("button", { name: titlePattern });
    await expect(taskRow).toBeVisible();

    // Complete while still offline — also optimistic.
    const checkbox = remindersSection.getByRole("checkbox", { name: checkboxPattern });
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Reconnect — TanStack Query's `onlineManager` auto-resumes paused
    // mutations on the browser's `online` event (see `QueryClient.mount()`),
    // replaying the queued create then complete against the real API.
    await context.setOffline(false);

    // Give the outbox a moment to replay, then reload from a clean slate —
    // if either mutation never actually reached the server, the reload
    // (which refetches from the API, not the optimistic cache) would show
    // the task missing or not struck.
    await expect(page.getByText(/back online/i)).toBeVisible({ timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
    await page.reload();

    const reloadedRow = remindersSection.getByRole("button", { name: titlePattern });
    await expect(reloadedRow).toBeVisible();
    await expect(remindersSection.getByRole("checkbox", { name: checkboxPattern })).toBeChecked();
  });
});
