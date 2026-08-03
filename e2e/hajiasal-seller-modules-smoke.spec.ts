import { test, expect } from "@playwright/test";
import { loginAsSeller } from "./helpers/auth";

/**
 * Smoke: every seller nav page — unauthenticated redirect + authenticated render.
 */
const SELLER_NAV_HREFS = [
  "/seller/dashboard",
  "/seller/products",
  "/seller/orders",
  "/seller/inventory",
  "/seller/customers",
  "/seller/wallet",
  "/seller/reports",
  "/seller/tickets",
  "/seller/notifications",
  "/seller/reviews",
  "/seller/qa",
  "/seller/discounts",
  "/seller/profile",
  "/seller/media",
  "/seller/print-export",
  "/seller/tools",
  "/seller/settings",
  "/seller/activity",
] as const;

const ERROR_BOUNDARY =
  /Application error|Internal Server Error|Unhandled Runtime Error|__next_error__/i;

function isSellerLoginUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return pathname === "/seller" || pathname === "/seller/";
  } catch {
    return false;
  }
}

test.describe("seller modules smoke — authenticated", () => {
  test.describe.configure({ retries: 1 });

  test("all nav pages load without error boundary", async ({ page }) => {
    test.setTimeout(300_000);

    const ok = await loginAsSeller(page);
    expect(
      ok,
      "Seller login failed — set SELLER_PASSWORD_S1 and SELLER_DEMO_PHONE=09121111111",
    ).toBe(true);

    for (const href of SELLER_NAV_HREFS) {
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60_000 });

      if (isSellerLoginUrl(page.url())) {
        const relogged = await loginAsSeller(page);
        expect(relogged).toBe(true);
        await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60_000 });
      }

      // Capability-denied routes (e.g. discounts) redirect to first allowed path.
      await expect(page).toHaveURL(/\/seller\//, { timeout: 15_000 });
      expect(isSellerLoginUrl(page.url())).toBe(false);
      await expect(page.locator("body")).not.toContainText(ERROR_BOUNDARY);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length, `empty body on ${href}`).toBeGreaterThan(20);
    }
  });
});

test.describe("seller modules smoke — unauthenticated", () => {
  for (const href of SELLER_NAV_HREFS) {
    test(`${href} redirects to login`, async ({ page }) => {
      await page.goto(href);
      await page.waitForURL(/\/seller\/?$/, { timeout: 15_000 });
      await expect(
        page.getByText(/ورود|فروشنده|موبایل|رمز/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  }
});
