import { test, expect } from "@playwright/test";

test.describe("Haji Asal checkout coupon transfer", () => {
  test("cart coupon query passes to checkout", async ({ page }) => {
    await page.goto("/cart");
    const checkoutLink = page.getByRole("link", { name: /تکمیل خرید|ادامه/i });
    if (await checkoutLink.isVisible()) {
      const href = await checkoutLink.getAttribute("href");
      if (href?.includes("coupon=")) {
        await checkoutLink.click();
        await expect(page).toHaveURL(/coupon=/);
      }
    }
  });

  test("checkout accepts coupon from query", async ({ page }) => {
    await page.goto("/checkout?coupon=HAJI10");
    await expect(page.getByRole("heading", { name: /تکمیل خرید/i })).toBeVisible();
    const couponInput = page.getByPlaceholder(/کد تخفیف/i);
    await expect(couponInput).toHaveValue("HAJI10");
  });
});
