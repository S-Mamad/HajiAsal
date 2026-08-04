import { test, expect } from "@playwright/test";
import { loginAsAdmin, TEST_OTP } from "./helpers/auth";

const adminPhone =
  process.env.ADMIN_TEST_PHONE?.trim() ||
  process.env.AUTH_TEST_PHONE?.trim() ||
  "09123456789";

test.describe("Haji Asal admin auth", () => {
  test("admin login page loads OTP form", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("button", { name: /دریافت کد/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/0912|موبایل/i).or(page.locator('input[autocomplete="tel"]')),
    ).toBeVisible();
  });

  test("rejects wrong OTP after send", async ({ page }) => {
    test.skip(
      process.env.NODE_ENV === "production" && !process.env.AUTH_TEST_OTP,
      "needs test OTP in non-prod",
    );
    await page.goto("/admin");
    const phoneInput = page
      .locator('input[autocomplete="tel"], input[inputmode="numeric"]')
      .first();
    await phoneInput.fill(adminPhone);
    await page.getByRole("button", { name: /دریافت کد/i }).click();
    await expect(page.getByLabel("رقم 1")).toBeVisible({ timeout: 15_000 });
    const wrong = "0000";
    for (let i = 0; i < wrong.length; i++) {
      await page.getByLabel(`رقم ${i + 1}`).fill(wrong[i]!);
    }
    await expect(page.getByText(/نادرست|نامعتبر|خطا/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("login succeeds with panel OTP", async ({ page }) => {
    test.skip(
      !process.env.AUTH_TEST_OTP && !process.env.ADMIN_TEST_PHONE,
      "AUTH_TEST_OTP / ADMIN_TEST_PHONE not set",
    );
    void TEST_OTP;
    const ok = await loginAsAdmin(page);
    expect(ok).toBe(true);
    await expect(page.getByText(/داشبورد|سفارش/i).first()).toBeVisible();
  });
});
