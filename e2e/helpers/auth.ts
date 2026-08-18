import { expect, type Page } from "@playwright/test";

export const TEST_PHONE = process.env.AUTH_TEST_PHONE ?? "09123456789";
export const TEST_OTP = process.env.AUTH_TEST_OTP ?? "1234";

function redirectMatcher(redirectPath: string): RegExp {
  const pathOnly = redirectPath.split("?")[0] || "/account";
  return new RegExp(pathOnly.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

async function completeOtpOnPage(page: Page, phone: string, otp: string) {
  const phoneField = page
    .getByLabel("شماره موبایل")
    .or(page.locator('input[inputmode="numeric"], input[autocomplete="tel"]').first());
  await expect(phoneField.first()).toBeVisible({ timeout: 30_000 });
  await phoneField.first().fill(phone);
  await page.getByRole("button", { name: /دریافت کد/ }).click();

  const otpDigit = page.getByLabel("رقم 1");
  const sendError = page.locator("p.text-red-500, p.text-sm.text-red-600").first();
  await expect(otpDigit.or(sendError)).toBeVisible({ timeout: 15_000 });
  if (
    (await sendError.isVisible().catch(() => false)) &&
    !(await otpDigit.isVisible().catch(() => false))
  ) {
    throw new Error(`OTP send failed: ${(await sendError.innerText()).trim()}`);
  }
  await expect(otpDigit).toBeVisible();

  const digits = otp.replace(/\D/g, "").slice(0, 10).split("");
  for (let i = 0; i < digits.length; i++) {
    await page.getByLabel(`رقم ${i + 1}`).fill(digits[i]!);
  }
}

export async function loginAsTestUser(
  page: Page,
  redirect = "/account",
): Promise<void> {
  const redirectPath = redirect.startsWith("/") ? redirect : `/${redirect}`;
  await page.goto(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  await completeOtpOnPage(page, TEST_PHONE, TEST_OTP);

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
      .getByRole("button", { name: /ثبت|ادامه/ })
      .click();
  }

  // Returning users may briefly see welcome before redirect.
  const welcomeContinue = page.getByRole("button", { name: "ادامه" });
  await Promise.race([
    page.waitForURL(pathRe, { timeout: 20_000 }),
    welcomeContinue.waitFor({ state: "visible", timeout: 5_000 }).then(async () => {
      if (await welcomeContinue.isVisible().catch(() => false)) {
        await welcomeContinue.click();
      }
    }),
  ]).catch(() => undefined);

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
  const phone =
    process.env.ADMIN_TEST_PHONE?.trim() ||
    process.env.AUTH_TEST_PHONE?.trim() ||
    "09123456789";
  const otp = process.env.AUTH_TEST_OTP ?? "1234";

  try {
    // Shared storefront OTP — eligibility checked on /admin after cookie is set.
    const send = await page.request.post("/api/auth/otp/send", {
      data: { phone },
      timeout: 30_000,
    });
    if (!send.ok()) return false;
    const verify = await page.request.post("/api/auth/otp/verify", {
      data: { phone, code: otp },
      timeout: 30_000,
    });
    if (verify.ok()) {
      await page.goto("/admin/dashboard");
      await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
      return true;
    }
  } catch {
    /* fall through to UI */
  }

  try {
    await loginAsTestUser(page, "/admin/dashboard");
    return /\/admin\/dashboard/.test(page.url());
  } catch {
    return false;
  }
}

export async function loginAsSeller(page: Page): Promise<boolean> {
  const phone = process.env.SELLER_DEMO_PHONE ?? "09121111111";
  const otp = process.env.AUTH_TEST_OTP ?? "1234";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const send = await page.request.post("/api/auth/otp/send", {
        data: { phone },
        timeout: 30_000,
      });
      if (send.ok()) {
        const verify = await page.request.post("/api/auth/otp/verify", {
          data: { phone, code: otp },
          timeout: 30_000,
        });
        if (verify.ok()) {
          await page.goto("/seller/dashboard");
          await page.waitForURL(/\/seller\/dashboard/, { timeout: 15_000 });
          return true;
        }
      }
    } catch {
      /* UI fallback */
    }

    try {
      await loginAsTestUser(page, "/seller/dashboard");
      return /\/seller\/dashboard/.test(page.url());
    } catch {
      if (attempt < 2) {
        await page.waitForTimeout(2_000 * (attempt + 1));
        continue;
      }
      return false;
    }
  }
  return false;
}

