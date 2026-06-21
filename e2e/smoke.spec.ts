import { expect, test } from "@playwright/test";

test("loads the app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Job Hunt Vault" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
});
