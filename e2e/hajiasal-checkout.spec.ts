import { test, expect } from "@playwright/test";
import { loginAsTestUser, addFirstShopProductToCart } from "./helpers/auth";

test.describe("Haji Asal auth", () => {
  test("test OTP login redirects to account", async ({ page }) => {
    await loginAsTestUser(page, "/account");
    await expect(page.getByRole("heading", { name: /سلام/ })).toBeVisible();
  });

  test("guest checkout prompts inline login", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /تکمیل خرید/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ورود با پیامک/i }),
    ).toBeVisible();
  });
});

test.describe("Haji Asal one-page checkout", () => {
  test("shows frictionless modules on one page", async ({ page }) => {
    await addFirstShopProductToCart(page);
    await loginAsTestUser(page, "/checkout");

    await expect(page.getByPlaceholder(/کد تخفیف/i)).toBeVisible({
      timeout: 15_000,
    });

    // No multi-step wizard
    await expect(page.getByRole("button", { name: "بعدی" })).toHaveCount(0);

    await expect(page.getByText("پرداخت امن از طریق درگاه رسمی")).toHaveCount(0);
    await expect(page.getByText("روش پرداخت")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /تایید و پرداخت/i }),
    ).toBeVisible();
    await expect(page.getByText("پیشنهاد ما")).toBeVisible();
    await expect(page.getByText(/پست ویژه/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /تحویل حضوری/ })).toBeVisible();
  });

  test("checkout without gateway does not fake-success", async ({ page }) => {
    const availability = await page.request.get("/api/checkout/availability");
    const gates = availability.ok()
      ? ((await availability.json()) as { zibal?: boolean; snappay?: boolean })
      : { zibal: false, snappay: false };

    await addFirstShopProductToCart(page);
    await loginAsTestUser(page, "/checkout");

    // Select shipping (required)
    await page.getByText(/پست ویژه/i).click();

    const pay = page.getByRole("button", { name: /تایید و پرداخت/i });
    await expect(pay).toBeVisible();

    if (!gates.zibal && !gates.snappay) {
      if (await pay.isEnabled().catch(() => false)) {
        await pay.click();
        await expect(page).not.toHaveURL(/\/checkout\/success/, {
          timeout: 10_000,
        });
      }
      return;
    }
  });
});
