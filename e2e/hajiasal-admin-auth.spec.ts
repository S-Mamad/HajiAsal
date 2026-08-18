import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsTestUser } from "./helpers/auth";

test.describe("Haji Asal admin auth (storefront session)", () => {
  test("unauthenticated /admin redirects to storefront login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("logged-in non-admin sees access denied", async ({ page }) => {
    test.skip(
      !process.env.AUTH_TEST_OTP,
      "AUTH_TEST_OTP not set",
    );
    // Use a phone that is unlikely to be in admin_users unless seeded as primary.
    // If AUTH_TEST_PHONE is a primary admin, this may land on dashboard — skip then.
    const phone = process.env.AUTH_TEST_PHONE ?? "09123456789";
    const primaries = (process.env.ADMIN_PRIMARY_PHONES ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    test.skip(
      primaries.includes(phone) ||
        phone === "09351925900" ||
        phone === "09135201973",
      "test phone is a primary admin",
    );

    await loginAsTestUser(page, "/admin");
    await expect(page.getByText(/اجازه دسترسی ندارید/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("link", { name: /پشتیبانی/i })).toBeVisible();
  });

  test("eligible admin reaches dashboard via storefront OTP", async ({
    page,
  }) => {
    test.skip(
      !process.env.AUTH_TEST_OTP && !process.env.ADMIN_TEST_PHONE,
      "AUTH_TEST_OTP / ADMIN_TEST_PHONE not set",
    );
    const ok = await loginAsAdmin(page);
    expect(ok).toBe(true);
    await expect(page.getByText(/داشبورد|سفارش/i).first()).toBeVisible();
  });
});
