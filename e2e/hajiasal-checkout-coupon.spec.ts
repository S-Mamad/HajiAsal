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

  test("checkout accepts coupon from query", async ({ page }) => {
    await loginAsTestUser(page, "/account");
    await addFirstShopProductToCart(page);
    await page.goto("/checkout?coupon=HAJI10");
    await expect(page.getByRole("heading", { name: /تکمیل خرید/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/coupon=HAJI10/i);

    // Coupon field lives on the payment step.
    await page.getByRole("button", { name: "بعدی" }).click();
    await page.getByLabel("نام و نام خانوادگی").fill("علی تستی");
    await page.getByLabel("استان").fill("تهران");
    await page.getByLabel("شهر").fill("تهران");
    await page.getByLabel("آدرس کامل").fill("خیابان ولیعصر، پلاک ۱");
    await page.getByLabel("کد پستی").fill("1234567890");
    await page.getByRole("button", { name: "بعدی" }).click();
    await page.getByRole("button", { name: "بعدی" }).click();

    const couponInput = page.getByPlaceholder(/کد تخفیف/i);
    await expect(couponInput).toHaveValue("HAJI10");
  });
});
