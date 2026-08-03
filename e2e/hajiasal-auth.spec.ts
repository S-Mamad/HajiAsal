import { test, expect } from "@playwright/test";

test.describe("Haji Asal auth flows", () => {
  test("login page has tabs and test phone flow", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "ورود" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ثبت‌نام" })).toBeVisible();

    await page.getByLabel("شماره موبایل").fill("09123456789");
    await page.getByRole("button", { name: /دریافت کد/ }).click();

    const otpDigit = page.getByLabel("رقم 1");
    const sendError = page.locator("p.text-red-500").first();
    await expect(otpDigit.or(sendError)).toBeVisible({ timeout: 15_000 });
    if (await sendError.isVisible().catch(() => false) && !(await otpDigit.isVisible().catch(() => false))) {
      throw new Error(`OTP send failed: ${(await sendError.innerText()).trim()}`);
    }
    await expect(otpDigit).toBeVisible();
    await expect(page.getByLabel("رقم 4")).toBeVisible();
    await expect(page.getByLabel("رقم 5")).toHaveCount(0);
  });

  test("register route redirects to login tab", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/tab=register/);
  });
});
