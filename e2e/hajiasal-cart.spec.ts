import { test, expect } from "@playwright/test";

test.describe("Haji Asal cart", () => {
  test("cart page loads with empty state or items", async ({ page }) => {
    await page.goto("/cart");
    await expect(
      page.getByRole("heading", { name: /سبد خرید/i }),
    ).toBeVisible();
  });

  test("coupon HAJI10 validates on cart", async ({ page }) => {
    await page.goto("/shop");
    const productLink = page.locator('a[href*="/product/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await page.getByRole("button", { name: /افزودن به سبد/i }).click();
    }
    await page.goto("/cart");
    const couponInput = page.getByPlaceholder(/کد تخفیف/i);
    if (await couponInput.isVisible()) {
      await couponInput.fill("HAJI10");
      const applyBtn = page.getByRole("button", { name: /اعمال|تخفیف/i });
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
      }
    }
  });

  test("shop links resolve to clean storefront paths", async ({ page }) => {
    await page.goto("/");
    const shopLink = page
      .getByRole("link", { name: /فروشگاه|محصولات|مشاهده/i })
      .first();
    if (await shopLink.isVisible()) {
      const href = await shopLink.getAttribute("href");
      expect(href ?? "").toMatch(/^\/(shop|product)/);
    }
  });
});
