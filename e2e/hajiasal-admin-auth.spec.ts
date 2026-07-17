import { test, expect } from "@playwright/test";

test.describe("Haji Asal admin auth", () => {
  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByLabel(/رمز عبور/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /ورود/i })).toBeVisible();
  });

  test("rejects wrong password", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel(/رمز عبور/i).fill("wrong-password");
    await page.getByRole("button", { name: /ورود/i }).click();
    await expect(page.getByText(/رمز|نامعتبر|غلط/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("login succeeds with ADMIN_PASSWORD env", async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD;
    test.skip(!password, "ADMIN_PASSWORD not set");

    await page.goto("/admin");
    await page.getByLabel(/رمز عبور/i).fill(password!);
    await page.getByRole("button", { name: /ورود/i }).click();
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText(/داشبورد|سفارش/i).first()).toBeVisible();
  });
});
