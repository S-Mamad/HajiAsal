import { test, expect } from "@playwright/test";
import { loginAsSeller } from "./helpers/auth";

test.describe("Haji Asal seller panel smoke", () => {
  test("seller login page loads", async ({ page }) => {
    await page.goto("/seller");
    await expect(page.getByText(/ورود|فروشنده|موبایل|رمز/i).first()).toBeVisible();
  });

  test("seller panel routes require auth", async ({ page }) => {
    await page.goto("/seller/dashboard");
    await page.waitForURL(/\/seller\/?$/, { timeout: 15_000 });
  });

  test("seller login and core pages", async ({ page }) => {
    const ok = await loginAsSeller(page);
    if (!ok) {
      throw new Error(
        "Seller login failed. Set SELLER_PASSWORD_S1 and SELLER_DEMO_PHONE=09121111111.",
      );
    }

    await expect(page.getByText(/داشبورد|فروش/i).first()).toBeVisible();

    await page.goto("/seller/products");
    await expect(page.getByText(/محصول|کاتالوگ|افزودن/i).first()).toBeVisible();

    await page.goto("/seller/orders");
    await expect(page.getByText(/سفارش/i).first()).toBeVisible();

    await page.goto("/seller/wallet");
    await expect(page.getByText(/کیف پول|قابل برداشت|تسویه/i).first()).toBeVisible();
  });
});
