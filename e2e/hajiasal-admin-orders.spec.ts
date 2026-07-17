import { test, expect } from "@playwright/test";

test.describe("Haji Asal admin orders", () => {
  test("orders page requires authentication", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/?$/);
  });
});
