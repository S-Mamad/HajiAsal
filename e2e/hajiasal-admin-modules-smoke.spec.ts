import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * Smoke: every admin nav page — unauthenticated redirect + authenticated render.
 * Full CRUD is out of scope; this catches auth holes and error boundaries.
 */
const ADMIN_NAV_HREFS = [
  "/admin/dashboard",
  "/admin/products",
  "/admin/product-fields",
  "/admin/categories",
  "/admin/brands",
  "/admin/inventory",
  "/admin/sellers",
  "/admin/orders",
  "/admin/customers",
  "/admin/coupons",
  "/admin/reviews",
  "/admin/qa",
  "/admin/messages",
  "/admin/tickets",
  "/admin/newsletter",
  "/admin/articles",
  "/admin/pages",
  "/admin/banners",
  "/admin/media",
  "/admin/content",
  "/admin/notifications",
  "/admin/reports",
  "/admin/logs",
  "/admin/users",
  "/admin/settings",
] as const;

const ERROR_BOUNDARY =
  /Application error|Internal Server Error|Unhandled Runtime Error|__next_error__/i;

/** Login surface: `/admin` (current) or `/admin/login` (legacy redirect). */
const LOGIN_URL = /\/admin(\/login)?\/?(\?|$)/;

test.describe("admin modules smoke", () => {
  test("unauthenticated: every nav path redirects to login", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    for (const href of ADMIN_NAV_HREFS) {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await page.waitForURL(LOGIN_URL, { timeout: 20_000 });
      await expect(
        page
          .getByRole("button", { name: /دریافت کد/i })
          .or(page.locator('input[autocomplete="tel"]')),
      ).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test("authenticated: every nav page loads without error boundary", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const ok = await loginAsAdmin(page);
    test.skip(!ok, "admin OTP login failed (set AUTH_TEST_OTP / ADMIN_TEST_PHONE)");

    for (const href of ADMIN_NAV_HREFS) {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/admin\//, { timeout: 20_000 });
      await expect(page.locator("body")).not.toContainText(ERROR_BOUNDARY);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length, `empty body on ${href}`).toBeGreaterThan(20);
    }
  });
});
