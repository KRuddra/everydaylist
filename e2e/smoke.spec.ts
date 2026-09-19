import { expect, test } from "@playwright/test";

test("app responds and renders a document", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("body")).toBeVisible();
});
