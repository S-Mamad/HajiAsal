# رجیستری باگ حاجی‌عسل

تاریخ اسکن: ۲۰۲۶-۰۷-۱۹  
به‌روزرسانی: ۲۰۲۶-۰۸-۰۳ (ادمین/فروشنده audit + فیکس + GAP عملیاتی)

فرمت: `BUG-ID | سطح | لایه | بخش | symptom | وضعیت | تست`

---

## Critical / High (رجیستری اولیه)

| ID | سطح | لایه | بخش | symptom | وضعیت | تست |
|----|------|------|------|---------|--------|------|
| BUG-01 | High | API | checkout | `POST /api/checkout/verify` بدون مالکیت | **fixed** | `e2e/hajiasal-api-security.spec.ts` |
| BUG-02 | High | UI | checkout | `clearCart` قبل از زرین‌پال | **fixed** | success page clear |
| BUG-03 | High | UI | checkout | query payment خوانده نمی‌شد | **fixed** | checkout page |
| BUG-04 | Med | API | checkout | `order=` vs `orderId=` | **fixed** | verify route |
| BUG-05 | High | API | coupons | `used_count` افزایش نمی‌یافت | **fixed** | `incrementSellerDiscountUsage` |
| BUG-06 | High | API | coupons | تخفیف فروشنده روی کل سبد | **fixed** | validateCouponAsync sellerIds + line subtotals |
| BUG-07 | Med | API | orders | `total` منفی | **fixed** | `commerce/money.test.ts` |
| BUG-08 | Med | API | coupons | GET لو دادن code | **fixed** | api-security e2e |
| BUG-09 | Med | API | checkout | create با HTTP ۲۰۰ روی شکست | **fixed** | create route 503/502 |
| BUG-11 | Med | API | pricing | بدون چک stockQty | **fixed** | order-pricing |
| BUG-12 | Med | API | pricing | qty تا ۹۹ vs clamp ۲۰ | **fixed** | checkout schema max 20 |
| BUG-13 | High | API | seller | وضعیت سفارش چندفروشنده‌ای | **fixed** | soleOwner در seller orders |
| BUG-14 | Med | UI | checkout | موفقیت بدون tracking | **fixed** | verify redirect |
| BUG-15 | Med | UI | cart | flash empty | **fixed** | cart `_hasHydrated` |
| BUG-16 | Med | UI | cart | hydrate زودهنگام Drawer | **fixed** | CartDrawer |
| BUG-17 | Low | Visual | cart | انیمیشن RTL غلط | **fixed** | CartDrawer x:100% |
| BUG-19 | Low | UI | cart | clearCart کوپن | **fixed** | `cart.test.ts` |
| BUG-20 | Med | API | checkout | پرداخت سفارش غیرقابل‌پرداخت | **fixed** | pending_payment only |
| BUG-21 | Med | API | seller | درصد >۱۰۰ | **fixed** | discounts schema |
| BUG-23 | Med | UI | checkout | ادامه پرداخت بعد از شکست | **fixed** | resumeOnlinePayment |
| BUG-25 | Med | UI | wishlist | فقط sync یک‌طرفه | **fixed** | wishlist-sync bidirectional |
| BUG-26 | Med | API | seller | middleware بدون گیت | **fixed** | middleware seller cookie + shape |
| BUG-28 | High | API | core | `getSiteSettings` پرتاب خطا وقتی MySQL در env هست ولی آفلاین → کل سایت ۵۰۰ | **fixed** | try/catch + fallback + connectTimeout |

---

## Admin / Seller (آگوست ۲۰۲۶)

| ID | سطح | لایه | بخش | symptom | وضعیت | تست / شاهد |
|----|------|------|------|---------|--------|------------|
| ADM-01 | Crit | API | admin-auth | session insert بدون `admin_user_id` → legacy super_admin | **fixed** | fallback فقط unknown column؛ legacy فقط وقتی userCount=0 |
| ADM-02 | High | API | admin-auth | لاگین فقط با رمز بعد از bootstrap | **fixed** | `admin-auth-security.test.ts` |
| ADM-03 | High | API | content | PATCH mass-assign کل SiteConfig | **fixed** | zod allowlist در content route |
| ADM-04 | High | API | dashboard/orders | نشت messages بدون `messages.view` | **fixed** | gate + adminHasPermission |
| ADM-05 | High | UI | products | فرم همیشه قیمت می‌فرستد → 403 | **fixed** | ProductFormShell + Can |
| ADM-06 | High | API | wallet | race رد برداشت double-credit | **fixed** | UPDATE … AND status='pending' |
| ADM-07 | Med | API | invoice | بدون `orders.print` | **fixed** | gateAdmin orders.print |
| SELL-01 | High | API | wallet | کیف‌پول از فروش شارژ نمی‌شد | **fixed** | credit روی delivered + wallet.test |
| SELL-02 | High | API | wallet | hold ledger می‌افتاد به memory | **fixed** | withMysqlTransaction؛ بدون memory fallback |
| SELL-04 | Med | API | wallet | برداشت بدون شبا | **fixed** | createWithdrawal + wallet route |
| SELL-05 | High | API | tickets | create memory / detail 404 | **fixed** | seller-tickets-memory مشترک |
| TKT-UI-01 | High | UI | account tickets | ارتفاع چت با header/nav overlap | **fixed** | fixed shell + CSS chrome vars |
| SELL-06 | Med | UI | seller | URL بدون capability | **fixed** | SellerRouteGuard |
| SELL-08/09 | Med | API | coupons | preview + used_count بدون seller_id | **fixed** | lineItems + increment by seller |
| SELL-10 | Med | API | orders | note success بدون persist | **fixed** | 503 بدون MySQL |
| SELL-12/13 | Low | UI | seller | خطای سبز / silent fail | **fixed** | orders detail + reviews/discounts |

---

## Residual (آگوست ۲۰۲۶ — پس از audit)

| ID | سطح | لایه | بخش | symptom | وضعیت | تست / شاهد |
|----|------|------|------|---------|--------|------------|
| RES-01 | High | API | coupons | `used_count` قبل از پرداخت موفق | **fixed** | increment روی `pending_payment→confirmed`؛ `coupons-paid-usage.test.ts` |
| RES-02 | High | API | wallet | credit روی delivered silent fail | **fixed** | credit قبل از flip وضعیت؛ خطا propagate |
| RES-03 | High | API | wallet | MySQL fail → موجودی memory/صفر | **fixed** | `WalletMysqlError`؛ wallet GET 503 |
| RES-04 | Med | API | seller | reviews/discounts/qa خطای DB = لیست خالی | **fixed** | GET 503 + UI error |
| SEC-01 | Crit | API | seller-orders | confirm روی `pending_payment` = bypass پرداخت | **fixed** | seller orders 403 unpaid |
| SEC-02 | Crit | API | checkout | verify GET بدون مالکیت/session | **fixed** | session+owns + payment-ref bind |
| SEC-03 | High | API | seller-auth | `SELLER_PASSWORD` env در production | **fixed** | فقط non-prod |
| SEC-04 | High | API | admin | layout با session unbound | **fixed** | `isAdminAuthenticated` → `getAdminAuthFromToken` |
| SEC-05 | High | API | rate-limit | OTP/orders فقط memory | **fixed** | `checkRateLimitAsync` + جدول `rate_limit_hits` |
| SEC-06 | Med | API | track/review | tracking ضعیف؛ review بدون session | **fixed** | `randomBytes`؛ review 401 بدون session |

---

## Commerce harden (آگوست ۲۰۲۶ — COM)

| ID | سطح | لایه | بخش | symptom | وضعیت | تست / شاهد |
|----|------|------|------|---------|--------|------------|
| COM-01 | High | API | stock | موجودی بعد از خرید کم نمی‌شد | **fixed** | `decrementStockForPaidOrder` روی confirm؛ `order-stock.test.ts` |
| COM-02 | High | API | payment-refs | unbound ref = allow (fail-open) | **fixed** | fail-closed؛ `payment-refs.test.ts` |
| COM-03 | High | API | checkout | confirm غیراتمی / race دوبار | **fixed** | `confirmPaidOrder` + `WHERE pending_payment`؛ `confirm-paid-order.test.ts` |
| COM-04 | Med | API | wallet | refund ادمین بدون clawback | **fixed** | `reverseSaleCreditsForOrder`؛ wallet.test |
| COM-05 | Med | API | snappay | settle بدون تطبیق مبلغ | **fixed** | `expectedAmountRial` در verify |
| COM-06 | Med | API | orders | orphan `pending_payment` بدون TTL | **fixed** | `expireStalePendingOrders` در POST orders |
| COM-07 | Low | E2E | checkout | success جعلی بدون درگاه | **fixed** | `hajiasal-checkout.spec.ts` + api-security |

---

## Feature gaps (wontfix-phase2)

| ID | مورد | تصمیم |
|----|------|--------|
| GAP-01 | آپلود باینری رسانه ادمین | **fixed** (آگوست ۲۰۲۶) — multipart → `public/uploads/admin`؛ data URL رد؛ `tests/admin/media.behavior.test.ts` |
| GAP-02 | SMTP/SMS واقعی سفارش | **fixed** (SMS وضعیت) — `order-notify.ts`؛ SMTP سفارش همچنان خارج از اسکوپ |
| GAP-03 | ورود ایمیل کامل | UI disabled؛ API 501 |
| GAP-04 | Refund واقعی درگاه | **fixed** (آگوست ۲۰۲۶) — `payment-refund.ts` fail-closed؛ `ZARINPAL_ACCESS_TOKEN`؛ snappay cancel؛ `manualRefund` اختیاری |

---

## حکم

باگ‌های Critical/High ادمین و فروشندهٔ این اسکن فیکس شدند. Residualهای P0 و Commerce harden و شکاف‌های عملیاتی پولی/اعلان/رسانه (`GAP-01/02/04`) هم بسته شدند. جزئیات تحویل در `plans/qa-report.md`.

**چک‌لیست دستی sandbox زرین‌پال:** یک سفارش تست → verify → استرداد از ادمین با `ZARINPAL_ACCESS_TOKEN` → تأیید برگشت در پنل زرین‌پال.

---

## Deep sweep (آگوست ۲۰۲۶ — پول/کوپن)

| ID | سطح | بخش | symptom | وضعیت | تست |
|----|------|------|---------|--------|------|
| SWEEP-01 | Crit | coupons | کد فروشنده روی سبد بدون `sellerId` → تخفیف روی کل مبلغ (`?? subtotal`) | **fixed** | `coupons-seller-scope.test.ts` |
| SWEEP-02 | High | checkout UI | ارسال `couponCode` خالی با `discount > 0` | **fixed** | fallback به `appliedCouponCode` |
| SWEEP-03 | Low | tests | payment-refs / SupportFab drift | **fixed** | suite سبز |
| SWEEP-04 | Crit | snappay | verify بدون amount = fail-open | **fixed** | `snappay.test.ts` |
| SWEEP-05 | Crit | otp | مصرف غیراتمی MySQL (TOCTOU multi-instance) | **fixed** | `otp-store.test.ts` |
| SWEEP-06 | Crit | refund | auto-refund زیبال no-op بدون آلرت | **fixed** | alert `api.error_critical` |
| SWEEP-07 | High | success | session منقضی → UI unpaid با سفارش confirmed | **fixed** | orderId+tracking |
| SWEEP-08 | High | checkout | حذف خاموش اقلام OOS | **fixed** | block + پیام |

Vitest هدف: سبز کامل پس از sweep.

---

## Frontend commerce UI (آگوست ۲۰۲۶ — UI-C)

| ID | سطح | بخش | symptom | وضعیت |
|----|------|------|---------|--------|
| UI-C01 | High | checkout | فلش سبد خالی بدون hydrate | **fixed** |
| UI-C02 | High | coupon | کد بدون اعمال تخفیف | **fixed** (auto-validate + persist) |
| UI-C03/04/13 | High | payment resume | سفارش یتیم / بدون resume در حساب | **fixed** |
| UI-C05/09 | High | wishlist | merge مانع حذف؛ sync روی toggle | **fixed** |
| UI-C06 | High | snappay | مجموع بدون کارمزد | **fixed** |
| UI-C07/08 | Med | track | deep-link و لینک success | **fixed** |
| UI-02/03 | High | sticky ATC / z-index | sentinel ته صفحه؛ drawer زیر sticky | **fixed** |
| UI-04 | High | login | step=complete بدون session | **fixed** |
| UI-C11/15 | Med | cart/PDP | stock pool؛ قیمت فروش وزن | **fixed** |

---

## Admin Module Test Sweep (آگوست ۲۰۲۶)

یافته‌های کشف‌شده با سوئیت جدید `tests/admin/**` + `e2e/hajiasal-admin-modules-smoke.spec.ts`:

| ID | سطح | لایه | بخش | symptom | وضعیت | تست / شاهد |
|----|------|------|------|---------|--------|------------|
| ADM-T01 | High | RBAC | orders | نقش `support` بدون `orders.refund` → استرداد فقط برای super_admin | **fixed** | `permissions.ts` + `orders.behavior.test.ts` |
| ADM-T02 | High | Test | api-gate | probe مجاز روی mutateهای سنگین → نوشتن `admin-users.json` آلوده | **fixed** | `skipAllowedProbe` دیگر handler را صدا نمی‌زند |
| ADM-T03 | Med | E2E | playwright | `NODE_ENV` غیر-development در webServer → EvalError middleware | **fixed** | `playwright.config.ts` اجبار `NODE_ENV=development` |
| ADM-T04 | Low | E2E | auth | لاگین فقط با رمز بعد از وجود کاربر شکست می‌خورد | **fixed** (helper) | `loginAsAdmin` با `ADMIN_LOGIN` پیش‌فرض `admin@hajiasal.local` |

معیارهای سبز sweep: ماتریس 401/403 همه `/api/admin` (غیر auth)، behavior گروه‌های حیاتی، nav×نقش، E2E smoke همه hrefهای nav.
