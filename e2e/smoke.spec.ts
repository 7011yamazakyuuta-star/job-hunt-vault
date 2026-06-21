import { expect, test } from "@playwright/test";

test("loads the app shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "今日の選考ボード" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "メイン" })).toBeVisible();
  await expect(page.getByRole("button", { name: "EN" })).toBeVisible();
});
