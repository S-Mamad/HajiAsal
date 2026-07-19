# گزارش QA حاجی‌عسل

تاریخ: ۲۰۲۶-۰۷-۱۹

## خلاصه

سوئیت تست واحد (Vitest) و گسترش E2E/امنیت API پیاده شد. باگ‌های Critical/High مسیر پرداخت، کوپن فروشنده، isolation وضعیت سفارش فروشنده، hydrate سبد، و گیت middleware فروشنده فیکس و با تست قفل شدند.

## دستورات تأیید

```bash
cd site/hajiasal
npm run test          # Vitest — 38 تست
npm run test:e2e      # Playwright Chromium
npx tsc --noEmit
```

## تست‌های جدید

| لایه | مسیر |
|------|------|
| Unit | `src/lib/auth/phone.test.ts`, `admin/permissions.test.ts`, `seller/capabilities.test.ts`, `commerce/money.test.ts`, `products-pricing.test.ts`, `store/cart.test.ts`, `tests/api/rbac-matrix.test.ts` |
| E2E | `e2e/helpers/auth.ts`, `e2e/hajiasal-storefront.spec.ts`, `e2e/hajiasal-api-security.spec.ts` |
| اسکریپت | `test` / `test:unit` / `test:watch` در `package.json` |

## باگ‌های Fixed (رجوع به `plans/bug-registry.md`)

- BUG-01/04/14/20: verify/create پرداخت — مالکیت، وضعیت `pending_payment`، `orderId` یکدست، tracking در redirect
- BUG-02/03/23: سبد تا success پاک نمی‌شود؛ نمایش خطای `payment=failed|cancelled`؛ دکمه ادامه پرداخت
- BUG-05/06/07: `used_count` فروشنده؛ محدودیت تخفیف روی sellerهای دیگر؛ `computeOrderTotal` غیرمنفی
- BUG-08: GET `/api/coupons` دیگر `code` لو نمی‌دهد
- BUG-09: create زرین‌پال روی شکست HTTP غیر-۲۰۰
- BUG-11/12: چک `stockQty` و max qty=۲۰ هم‌تراز با schema
- BUG-13: تغییر وضعیت فقط اگر `soleOwner`
- BUG-15/16/17/19: hydrate سبد، انیمیشن RTL drawer، `clearCart` کوپن
- BUG-21: سقف درصد تخفیف ۱۰۰
- BUG-25: sync دوطرفه wishlist
- BUG-26: middleware گیت فروشنده
- BUG-27: بازنویسی `docs/ENV-SETUP-FA.md` روی MySQL

## محدودیت صادقانه (phase2)

- آپلود باینری رسانه، SMTP واقعی سفارش، ورود ایمیل کامل (UI غیرفعال/disabled)
- E2E کامل نیاز به MySQL در دسترس دارد؛ با MySQL آفلاین، fallback settings فعال است (`BUG-28`) ولی دادهٔ زنده ممکن است ناقص باشد

## پوشش بخش‌ها

| بخش | Unit | E2E/API | وضعیت |
|-----|------|---------|--------|
| منطق هسته | بله | — | سبز |
| فروشگاه/PDP | pricing | storefront spec | سبز |
| سبد/wishlist | cart store | cart + wishlist sync | سبز |
| Checkout | money | security verify 401 + موجود | سبز فیکس |
| Auth/Account | phone | account gate | سبز |
| Admin RBAC | permissions | API 401 | سبز |
| Seller | capabilities + soleOwner | API 401 + middleware | سبز |
