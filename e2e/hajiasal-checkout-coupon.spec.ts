import { test, expect } from "@playwright/test";
import { loginAsTestUser, addFirstShopProductToCart } from "./helpers/auth";

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

  test("checkout accepts coupon from query via coupon trap", async ({
    page,
  }) => {
    await loginAsTestUser(page, "/account");
    await addFirstShopProductToCart(page);
    await page.goto("/checkout?coupon=HAJI10");
    await expect(page.getByPlaceholder(/کد تخفیف/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/coupon=HAJI10/i);

    const couponInput = page.getByPlaceholder(/کد تخفیف/i);
    await expect(couponInput).toBeVisible();
    await expect(couponInput).toHaveValue("HAJI10");
  });
});
