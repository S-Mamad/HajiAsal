import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Haji Asal admin auth", () => {
  test("admin login page loads", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /ورود/i })).toBeVisible();
  });

  test("rejects wrong password", async ({ page }) => {
    await page.goto("/admin");
    const login =
      process.env.ADMIN_LOGIN?.trim() || "admin@hajiasal.local";
    await page.locator('input[autocomplete="username"]').fill(login);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: /ورود/i }).click();
    await expect(page.getByText(/رمز|نامعتبر|غلط|نادرست/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("login succeeds with ADMIN_PASSWORD env", async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD not set");
    const ok = await loginAsAdmin(page);
    expect(ok).toBe(true);
    await expect(page.getByText(/داشبورد|سفارش/i).first()).toBeVisible();
  });
});
