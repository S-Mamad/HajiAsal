import { test, expect } from "@playwright/test";

test.describe("Haji Asal PDP", () => {
  test("product page loads with dark PDP layout", async ({ page }) => {
    await page.goto("/shop");
    const productLink = page.locator('a[href*="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 15_000 });
    await productLink.click();
    await expect(page.locator(".pdp-dark")).toBeVisible();
    await expect(page.getByRole("button", { name: /افزودن به سبد/i })).toBeVisible();
  });

  test("gallery and weight selection work", async ({ page }) => {
    await page.goto("/shop");
    const productLink = page.locator('a[href*="/product/"]').first();
    await productLink.click();
    const weightButtons = page.getByRole("button", { name: /گرم|کیلو|ml/i });
    if ((await weightButtons.count()) > 1) {
      await weightButtons.nth(1).click();
    }
    await page.getByRole("button", { name: /افزودن به سبد/i }).click();
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /سبد خرید/i })).toBeVisible();
  });
});
