import { test, expect } from "@playwright/test";

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
    const phone = process.env.SELLER_DEMO_PHONE ?? "09120000001";
    const password =
      process.env.SELLER_PASSWORD_S1 ??
      process.env.SELLER_DEMO_PASSWORD ??
      "seller123";

    await page.goto("/seller");
    const phoneInput = page.getByLabel(/موبایل|شماره/i).or(
      page.locator('input[name="phone"], input[type="tel"]').first(),
    );
    const passInput = page.getByLabel(/رمز/i).or(
      page.locator('input[name="password"], input[type="password"]').first(),
    );
    await phoneInput.fill(phone);
    await passInput.fill(password);
    await page.getByRole("button", { name: /ورود/i }).click();

    await page.waitForURL(/\/seller\/dashboard/, { timeout: 20_000 }).catch(async () => {
      // If demo credentials fail, still assert login page feedback
      await expect(page.getByText(/یافت نشد|نادرست|خطا|فعال/i).first()).toBeVisible({
        timeout: 5_000,
      });
      test.skip(true, "Seller demo credentials not available");
    });

    await expect(page.getByText(/داشبورد|فروش/i).first()).toBeVisible();

    await page.goto("/seller/products");
    await expect(page.getByText(/محصول|کاتالوگ|افزودن/i).first()).toBeVisible();

    await page.goto("/seller/orders");
    await expect(page.getByText(/سفارش/i).first()).toBeVisible();

    await page.goto("/seller/wallet");
    await expect(page.getByText(/کیف پول|قابل برداشت|تسویه/i).first()).toBeVisible();
  });
});
