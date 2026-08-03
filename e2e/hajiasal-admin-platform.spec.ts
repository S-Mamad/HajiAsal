import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const LOGIN_URL = /\/admin(\/login)?\/?(\?|$)/;

test.describe("Haji Asal admin platform smoke", () => {
  test("brands page requires auth redirect", async ({ page }) => {
    await page.goto("/admin/brands");
    await page.waitForURL(LOGIN_URL, { timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("after login, brands nav is reachable", async ({ page }) => {
    test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD not set");
    const ok = await loginAsAdmin(page);
    expect(ok).toBe(true);

    await page.goto("/admin/brands");
    await expect(page.getByText(/برند|افزودن|داده‌ای/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
