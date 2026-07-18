import { test, expect } from "@playwright/test";

test.describe("Haji Asal admin platform smoke", () => {
  test("brands page requires auth redirect", async ({ page }) => {
    await page.goto("/admin/brands");
    await page.waitForURL(/\/admin\/?$/, { timeout: 10_000 });
    await expect(page.getByLabel(/رمز عبور/i)).toBeVisible();
  });

  test("after login, brands nav is reachable", async ({ page }) => {
    const password = process.env.ADMIN_PASSWORD;
    test.skip(!password, "ADMIN_PASSWORD not set");

    await page.goto("/admin");
    await page.getByLabel(/رمز عبور/i).fill(password!);
    await page.getByRole("button", { name: /ورود/i }).click();
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });

    await page.goto("/admin/brands");
    await expect(page.getByText(/برند|افزودن|داده‌ای/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
