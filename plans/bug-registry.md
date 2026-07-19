# رجیستری باگ حاجی‌عسل

تاریخ اسکن: ۲۰۲۶-۰۷-۱۹  
به‌روزرسانی: ۲۰۲۶-۰۷-۱۹ (پس از TDD فیکس)

فرمت: `BUG-ID | سطح | لایه | بخش | symptom | وضعیت | تست`

---

## Critical / High

| ID | سطح | لایه | بخش | symptom | وضعیت | تست |
|----|------|------|------|---------|--------|------|
| BUG-01 | High | API | checkout | `POST /api/checkout/verify` بدون مالکیت | **fixed** | `e2e/hajiasal-api-security.spec.ts` |
| BUG-02 | High | UI | checkout | `clearCart` قبل از زرین‌پال | **fixed** | success page clear |
| BUG-03 | High | UI | checkout | query payment خوانده نمی‌شد | **fixed** | checkout page |
| BUG-04 | Med | API | checkout | `order=` vs `orderId=` | **fixed** | verify route |
| BUG-05 | High | API | coupons | `used_count` افزایش نمی‌یافت | **fixed** | `incrementSellerDiscountUsage` |
| BUG-06 | High | API | coupons | تخفیف فروشنده روی کل سبد | **fixed** | validateCouponAsync sellerIds |
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
| BUG-26 | Med | API | seller | middleware بدون گیت | **fixed** | middleware seller cookie |
| BUG-28 | High | API | core | `getSiteSettings` پرتاب خطا وقتی MySQL در env هست ولی آفلاین → کل سایت ۵۰۰ | **fixed** | try/catch + fallback + connectTimeout |

---

## Feature gaps (wontfix-phase2)

| ID | مورد | تصمیم |
|----|------|--------|
| GAP-01 | آپلود باینری رسانه | wontfix-phase2 |
| GAP-02 | SMTP/SMS واقعی سفارش | wontfix-phase2 |
| GAP-03 | ورود ایمیل کامل | UI disabled؛ API 501 |

---

## حکم

صفر باگ Critical/High باز. جزئیات تحویل در `plans/qa-report.md`.
