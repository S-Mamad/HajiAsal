import { expect, type Page } from "@playwright/test";

export const TEST_PHONE = process.env.AUTH_TEST_PHONE ?? "09123456789";
export const TEST_OTP = process.env.AUTH_TEST_OTP ?? "1234";

export async function loginAsTestUser(
  page: Page,
  redirect = "/account",
): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);

  await page.getByLabel("شماره موبایل").fill(TEST_PHONE);
  await page.getByRole("button", { name: /دریافت کد/ }).click();

  await expect(page.getByLabel("رقم 1")).toBeVisible({ timeout: 10_000 });

  const digits = TEST_OTP.replace(/\D/g, "").slice(0, 4).split("");
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

export async function addFirstShopProductToCart(page: Page): Promise<void> {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: /فروشگاه/i })).toBeVisible({
    timeout: 15_000,
  });
  const firstProduct = page.locator('a[href^="/product/"]').first();
  await firstProduct.click();
  await expect(page.getByRole("button", { name: "افزودن به سبد" })).toBeVisible();
  await page.getByRole("button", { name: "افزودن به سبد" }).click();
}

export async function loginAsAdmin(page: Page): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  await page.goto("/admin");
  await page.getByLabel(/رمز عبور/i).fill(password);
  await page.getByRole("button", { name: /ورود/i }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
  return true;
}

export async function loginAsSeller(page: Page): Promise<boolean> {
  const phone = process.env.SELLER_DEMO_PHONE ?? "09120000001";
  const password =
    process.env.SELLER_PASSWORD_S1 ??
    process.env.SELLER_DEMO_PASSWORD ??
    "seller123";

  await page.goto("/seller");
  const phoneInput = page
    .getByLabel(/موبایل|شماره/i)
    .or(page.locator('input[name="phone"], input[type="tel"]').first());
  const passInput = page
    .getByLabel(/رمز/i)
    .or(page.locator('input[name="password"], input[type="password"]').first());
  await phoneInput.fill(phone);
  await passInput.fill(password);
  await page.getByRole("button", { name: /ورود/i }).click();
  try {
    await page.waitForURL(/\/seller\/dashboard/, { timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}
