import { test, expect } from "@playwright/test";
import { loginAsTestUser, addFirstShopProductToCart } from "./helpers/auth";

test.describe("Haji Asal auth", () => {
  test("test OTP login redirects to account", async ({ page }) => {
    await loginAsTestUser(page, "/account");
    await expect(page.getByRole("heading", { name: /سلام/ })).toBeVisible();
  });

  test("guest checkout redirects to login", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain("redirect=");
  });
});

test.describe("Haji Asal checkout payment gate", () => {
  test("checkout without gateway does not fake-success", async ({ page }) => {
    const availability = await page.request.get("/api/checkout/availability");
    const gates = availability.ok()
      ? ((await availability.json()) as { zibal?: boolean; snappay?: boolean })
      : { zibal: false, snappay: false };

    await addFirstShopProductToCart(page);
    await loginAsTestUser(page, "/checkout");

    await page.getByRole("button", { name: "بعدی" }).click();

    await page.getByLabel("نام و نام خانوادگی").fill("علی تستی");
    await page.getByLabel("استان").fill("تهران");
    await page.getByLabel("شهر").fill("تهران");
    await page.getByLabel("آدرس کامل").fill("خیابان ولیعصر، پلاک ۱");
    await page.getByLabel("کد پستی").fill("1234567890");
    await page.getByRole("button", { name: "بعدی" }).click();

    await page.getByRole("button", { name: "بعدی" }).click();

    if (!gates.zibal && !gates.snappay) {
      // No gateway configured: submit must not land on success page.
      const submit = page.getByRole("button", { name: /ثبت سفارش/ });
      if (await submit.isEnabled().catch(() => false)) {
        await submit.click();
        await expect(page).not.toHaveURL(/\/checkout\/success/, {
          timeout: 10_000,
        });
        await expect(
          page.getByText(/درگاه|پرداخت|در دسترس|پیکربندی|انتقال|روش پرداخت/i),
        ).toBeVisible({ timeout: 10_000 });
      }
      return;
    }

    // Gateway available: redirect away from checkout form is expected.
    await page.getByRole("button", { name: /ثبت سفارش/ }).click();
    await expect(page).not.toHaveURL(/\/checkout$/, { timeout: 20_000 });
  });
});
