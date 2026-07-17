import { test, expect, type Page } from "@playwright/test";

const TEST_PHONE = "09123456789";
const TEST_OTP = "1234";

async function loginAsTestUser(page: Page, redirect = "/checkout") {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);

  await page.getByLabel("شماره موبایل").fill(TEST_PHONE);
  await page.getByRole("button", { name: /دریافت کد/ }).click();

  await expect(page.getByLabel("رقم 1")).toBeVisible({ timeout: 10_000 });

  const digits = TEST_OTP.split("");
  for (let i = 0; i < digits.length; i++) {
    await page.getByLabel(`رقم ${i + 1}`).fill(digits[i]!);
  }

  await page.getByRole("button", { name: /ورود|ادامه ثبت/ }).click();

  const nameField = page.getByLabel("نام و نام خانوادگی");
  if (await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameField.fill("علی تستی");
    await page.getByRole("button", { name: /ثبت‌نام/ }).click();
  }

  await expect(page).toHaveURL(new RegExp(redirect.replace(/\//g, "\\/")), {
    timeout: 15_000,
  });
}

test.describe("Haji Asal auth", () => {
  test("test OTP login redirects to account", async ({ page }) => {
    await loginAsTestUser(page, "/account");
    await expect(page.getByRole("heading", { name: /سلام/ })).toBeVisible();
  });

  test("guest checkout redirects to login", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.url()).toContain("redirect=");
  });
});

test.describe("Haji Asal checkout happy path", () => {
  test("browse shop, login, add product, complete checkout", async ({ page }) => {
    await page.goto("/shop");

    await expect(page.getByRole("heading", { name: /فروشگاه/i })).toBeVisible({
      timeout: 15_000,
    });

    const firstProduct = page.locator('a[href^="/product/"]').first();
    await firstProduct.click();

    await expect(page.getByRole("button", { name: "افزودن به سبد" })).toBeVisible();
    await page.getByRole("button", { name: "افزودن به سبد" }).click();

    await loginAsTestUser(page, "/checkout");

    await page.getByRole("button", { name: "بعدی" }).click();

    await page.getByLabel("نام و نام خانوادگی").fill("علی تستی");
    await page.getByLabel("استان").selectOption("تهران");
    await page.getByLabel("شهر").selectOption("تهران");
    await page.getByLabel("آدرس کامل").fill("خیابان ولیعصر، پلاک ۱");
    await page.getByLabel("کد پستی").fill("1234567890");
    await page.getByRole("button", { name: "بعدی" }).click();

    await page.getByRole("button", { name: "بعدی" }).click();

    await page.getByRole("button", { name: /ثبت سفارش/ }).click();

    await expect(page).toHaveURL(/\/checkout\/success/, {
      timeout: 15_000,
    });
    await expect(page.getByText(/سفارش.*ثبت/)).toBeVisible();
  });
});
