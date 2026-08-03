# گزارش QA حاجی‌عسل

تاریخ: ۲۰۲۶-۰۷-۱۹ · به‌روزرسانی: ۲۰۲۶-۰۸-۰۳ (GAP-01/02/04 + Commerce COM)

## خلاصه

سوئیت تست واحد (Vitest) و گسترش E2E/امنیت API پیاده شد. باگ‌های Critical/High مسیر پرداخت، کوپن فروشنده، isolation وضعیت سفارش فروشنده، hydrate سبد، و گیت middleware فروشنده فیکس و با تست قفل شدند.

**آگوست ۲۰۲۶:** سوئیت ماژول‌به‌ماژول پنل ادمین + سخت‌سازی خرید/فروش (`confirmPaidOrder` اتمی، payment-ref fail-closed، کاهش موجودی روی confirm، clawback کیف‌پول روی refund delivered، TTL سفارش یتیم، تطبیق مبلغ اسنپ‌پی). سپس `GAP-04` استرداد درگاه fail-closed، `GAP-02` SMS وضعیت سفارش، و `GAP-01` multipart رسانه ادمین بسته شد.

## دستورات تأیید

```bash
cd site/hajiasal
npm run test          # Vitest (شامل order-stock / confirm-paid-order / payment-refs / wallet)
npx playwright test e2e/hajiasal-api-security.spec.ts e2e/hajiasal-checkout.spec.ts e2e/hajiasal-cart.spec.ts
npx tsc --noEmit
```

## Commerce harden — قبل/بعد

| معیار | قبل از COM | بعد از COM |
|------|------------|------------|
| Vitest | 656 سبز | 663+ سبز (تست‌های confirm/stock/reversal) |
| `tsc --noEmit` | سبز | سبز |
| payment-ref unbound | allow | reject |
| stock پس از پرداخت | بدون تغییر | decrement + shortage note |
| confirm race | UPDATE by id | `WHERE status='pending_payment'` |
| refund delivered | فقط فلگ | `sale_reversal` ledger |

## تست‌های جدید

| لایه | مسیر |
|------|------|
| Unit | `src/lib/auth/phone.test.ts`, `admin/permissions.test.ts`, `seller/capabilities.test.ts`, `commerce/money.test.ts`, `products-pricing.test.ts`, `store/cart.test.ts`, `tests/api/rbac-matrix.test.ts` |
| Commerce | `src/lib/server/confirm-paid-order.test.ts`, `order-stock.test.ts`, `payment-refs.test.ts`, `seller-wallet.test.ts` (reversal) |
| Admin sweep | `tests/admin/harness.ts`, `module-catalog.ts`, `api-gate-matrix.test.ts`, `*.behavior.test.ts` |
| E2E | `e2e/helpers/auth.ts`, `e2e/hajiasal-storefront.spec.ts`, `e2e/hajiasal-api-security.spec.ts`, `e2e/hajiasal-checkout.spec.ts` |
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
- ADM-T01: `orders.refund` برای نقش support
- ADM-T02: جلوگیری از mutate ناخواسته در ماتریس API
- GAP-04: استرداد واقعی درگاه (fail-closed) + persist settle_ref
- GAP-02: SMS وضعیت سفارش (confirmed/shipped/cancelled/refunded)
- GAP-01: آپلود multipart رسانه ادمین روی دیسک
- COM-01…07: موجودی، payment-ref، confirm اتمی، clawback، snappay amount، TTL orphan، E2E بدون success جعلی

## Admin Module Sweep — پوشش ماژول‌ها

| گروه | API gate | Behavior | E2E smoke | باگ باز |
|------|----------|----------|-----------|---------|
| auth | — (ungated) | `auth.behavior` | login در smoke | — |
| dashboard | ✓ | نشت messages | ✓ | — |
| products | ✓ | edit_price/publish/delete | ✓ | — |
| orders | ✓ | refund + messages | ✓ | — |
| content/settings | ✓ | allowlist shippingCost | ✓ | — |
| sellers/wallet | ✓ | ownership + pending race | ✓ | — |
| CRUD (brands…qa) | ✓ | zod 400 + role deny | ✓ | — |
| nav RBAC | — | همه href × ۴ نقش | ✓ | — |
| سیستم (users/logs/…) | ✓ | از طریق ماتریس/nav | ✓ | — |

## محدودیت صادقانه (phase2)

- SMTP واقعی سفارش (SMS وضعیت سفارش پیاده شد: `order-notify.ts`)
- ورود ایمیل کامل (UI غیرفعال/disabled)
- استرداد زرین‌پال نیازمند `ZARINPAL_ACCESS_TOKEN` (چک دستی sandbox)
- E2E CRUD کامل فرم‌ها خارج از اسکوپ؛ smoke فقط دسترسی/رندر
- با MySQL در `.env` ولی آفلاین، webServer E2E عمداً MYSQL_* را خالی می‌کند تا FS fallback پایدار بماند

## پوشش بخش‌ها

| بخش | Unit | E2E/API | وضعیت |
|-----|------|---------|--------|
| منطق هسته | بله | — | سبز |
| فروشگاه/PDP | pricing | storefront spec | سبز |
| سبد/wishlist | cart store | cart + wishlist sync | سبز |
| Checkout | money + confirmPaid + stock | security verify 401 + track privacy | سبز فیکس |
| Auth/Account | phone | account gate | سبز |
| Admin RBAC | permissions + admin sweep | modules smoke + API matrix | سبز |
| Seller | capabilities + soleOwner | API 401 + middleware | سبز |
| Wallet | credit + reversal | — | سبز |
