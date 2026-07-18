# مشخصات پنل مدیریت و فروشنده حاجی‌عسل

## ادمین — مسیرها

| مسیر | وضعیت |
|------|--------|
| `/admin` | ورود (کاربر ادمین / bootstrap) |
| `/admin/dashboard` | KPI + نمودار + آخرین‌ها |
| `/admin/orders` · `[id]` | سفارش‌ها |
| `/admin/products` · `[id]` · `new` | محصولات |
| `/admin/brands` | برندها |
| `/admin/categories` | دسته‌ها |
| `/admin/sellers` · `[id]` | فروشندگان |
| `/admin/inventory` | موجودی |
| `/admin/customers` · `[id]` | مشتریان |
| `/admin/reviews` | نظرات |
| `/admin/coupons` | کوپن |
| `/admin/messages` | پیام تماس |
| `/admin/newsletter` | خبرنامه |
| `/admin/articles` | مقالات |
| `/admin/media` | رسانه |
| `/admin/banners` | بنرها |
| `/admin/pages` | صفحات CMS |
| `/admin/qa` | پرسش و پاسخ محصول |
| `/admin/tickets` | تیکت پشتیبانی |
| `/admin/notifications` | اعلان‌ها |
| `/admin/users` | کاربران پنل |
| `/admin/reports` | گزارش‌ها |
| `/admin/logs` | لاگ سیستم |
| `/admin/content` | محتوا (legacy alias) |
| `/admin/settings` | تنظیمات |

- کوکی: `hajiasal_admin_session`
- Auth: جدول `admin_users` + نقش؛ bootstrap با `ADMIN_PASSWORD`
- StoreChrome برای `/admin` غیرفعال است
- مستندات: `ADMIN-ARCHITECTURE-FA.md`, `ADMIN-RBAC-FA.md`, `ADMIN-UI-STANDARDS-FA.md`

## فروشنده

مسیرهای `/seller/*` و کوکی `hajiasal_seller_session` جدا از ادمین هستند.

**وضعیت پیاده‌سازی (۲۰۲۶-۰۷):** Foundation + ۱۷ ماژول مسیر/UI/API پایه تحویل شده‌اند (F0–F4). Migration: `mysql-migrations/007_seller_panel.sql`.

مستندات اختصاصی پنل فروشنده:

- `CONTEXT-SELLER.md`
- `SELLER-SPEC.md`
- `SELLER-ARCHITECTURE-FA.md`
- `SELLER-RBAC-FA.md`
- `SELLER-UI-STANDARDS-FA.md`
- `SELLER-GLOBAL-FEATURES-FA.md`
- `SELLER-MODULES-FA.md`
- `SELLER-MODULE-CHECKLIST-FA.md`
- پلن اجرا: `plans/hajiasal-seller/`
