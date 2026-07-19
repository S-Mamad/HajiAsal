import { test, expect } from "@playwright/test";
import { addFirstShopProductToCart, loginAsTestUser } from "./helpers/auth";

test.describe("Haji Asal storefront", () => {
  test("home and shop load", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: /فروشگاه/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("PDP add to cart then cart shows item", async ({ page }) => {
    await addFirstShopProductToCart(page);
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: /سبد خرید/i })).toBeVisible();
    await expect(page.getByText(/تکمیل خرید|حذف|تعداد/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("wishlist page loads", async ({ page }) => {
    await page.goto("/wishlist");
    await expect(page.getByText(/علاقه‌مندی/i).first()).toBeVisible();
  });
});

test.describe("Haji Asal account gate", () => {
  test("account redirects guests to login", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logged-in user can open account", async ({ page }) => {
    await loginAsTestUser(page, "/account");
    await expect(page.getByText(/سلام|حساب|سفارش/i).first()).toBeVisible();
  });
});
