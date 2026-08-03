import { expect, type Page } from "@playwright/test";

export const TEST_PHONE = process.env.AUTH_TEST_PHONE ?? "09123456789";
export const TEST_OTP = process.env.AUTH_TEST_OTP ?? "1234";

function redirectMatcher(redirectPath: string): RegExp {
  const pathOnly = redirectPath.split("?")[0] || "/account";
  return new RegExp(pathOnly.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

export async function loginAsTestUser(
  page: Page,
  redirect = "/account",
): Promise<void> {
  const redirectPath = redirect.startsWith("/") ? redirect : `/${redirect}`;
  await page.goto(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  const phoneField = page.getByLabel("شماره موبایل");
  await expect(phoneField).toBeVisible({ timeout: 30_000 });
  await phoneField.fill(TEST_PHONE);
  await page.getByRole("button", { name: /دریافت کد/ }).click();

  const otpDigit = page.getByLabel("رقم 1");
  const sendError = page.locator("p.text-red-500, p.text-sm.text-red-500").first();
  await expect(otpDigit.or(sendError)).toBeVisible({ timeout: 15_000 });
  if (
    (await sendError.isVisible().catch(() => false)) &&
    !(await otpDigit.isVisible().catch(() => false))
  ) {
    throw new Error(`OTP send failed: ${(await sendError.innerText()).trim()}`);
  }
  await expect(otpDigit).toBeVisible();

  const digits = TEST_OTP.replace(/\D/g, "").slice(0, 4).split("");
  for (let i = 0; i < digits.length; i++) {
    await page.getByLabel(`رقم ${i + 1}`).fill(digits[i]!);
  }

  // OTP auto-submits when complete; avoid clicking the "ورود" tab.
  const nameField = page.getByLabel("نام و نام خانوادگی");
  const pathRe = redirectMatcher(redirectPath);

  await Promise.race([
    page.waitForURL(pathRe, { timeout: 20_000 }),
    nameField.waitFor({ state: "visible", timeout: 20_000 }),
  ]).catch(() => undefined);

  if (await nameField.isVisible().catch(() => false)) {
    await nameField.fill("علی تستی");
    await page
      .locator("form")
      .getByRole("button", { name: /ثبت‌نام|ادامه/ })
      .click();
  }

  await expect(page).toHaveURL(pathRe, { timeout: 20_000 });
  if (/coupon=/i.test(redirectPath)) {
    await expect(page).toHaveURL(/coupon=/i, { timeout: 5_000 });
  }
}

export async function addFirstShopProductToCart(page: Page): Promise<void> {
  await page.goto("/shop");
  await expect(
    page.getByRole("heading", { name: /فروشگاه/i }).or(page.locator('a[href*="/product/"]').first()),
  ).toBeVisible({ timeout: 30_000 });
  const firstProduct = page.locator('a[href*="/product/"]').first();
  await expect(firstProduct).toBeVisible({ timeout: 15_000 });
  await firstProduct.click();
  await expect(page).toHaveURL(/\/product\//, { timeout: 15_000 });
  const addBtn = page.getByRole("button", { name: /افزودن به سبد/i });
  await expect(addBtn).toBeVisible({ timeout: 15_000 });
  await addBtn.click();
}

export async function loginAsAdmin(page: Page): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  // After bootstrap, password-only login is rejected; default to known local admin.
  const login =
    process.env.ADMIN_LOGIN?.trim() || "admin@hajiasal.local";

  // Prefer API login (shares cookie jar with the page) to avoid UI rate-limit
  // when many admin smoke tests authenticate in one run.
  try {
    const res = await page.request.post("/api/admin/auth", {
      data: { password, login },
      timeout: 30_000,
    });
    if (res.ok()) {
      await page.goto("/admin/dashboard");
      await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
      return true;
    }
  } catch {
    // fall through to UI login
  }

  // Fallback: UI login
  await page.goto("/admin");
  const loginField = page.locator('input[autocomplete="username"]').first();
  if (await loginField.isVisible().catch(() => false)) {
    await loginField.fill(login);
  }
  const passField = page.locator('input[type="password"]').first();
  await passField.fill(password);
  await page.getByRole("button", { name: /ورود/i }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
  return true;
}

export async function loginAsSeller(page: Page): Promise<boolean> {
  const phone = process.env.SELLER_DEMO_PHONE ?? "09121111111";
  const password =
    process.env.SELLER_PASSWORD_S1 ??
    process.env.SELLER_DEMO_PASSWORD ??
    "seller123";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto("/seller");
    const phoneInput = page.locator('input[inputmode="tel"], input[type="tel"]').first();
    const passInput = page.locator('input[type="password"]').first();
    await phoneInput.waitFor({ state: "visible", timeout: 10_000 });
    await phoneInput.fill(phone);
    await passInput.fill(password);
    await page.getByRole("button", { name: /ورود/i }).click();
    try {
      await page.waitForURL(/\/seller\/dashboard/, { timeout: 20_000 });
      return true;
    } catch {
      const body = await page.locator("body").innerText().catch(() => "");
      if (/تلاش زیاد|کمی بعد/i.test(body) && attempt < 2) {
        await page.waitForTimeout(2_000 * (attempt + 1));
        continue;
      }
      return false;
    }
  }
  return false;
}
