# مشخصات پنل مدیریت و فروشنده حاجی‌عسل

## ادمین

| مسیر | وضعیت |
|------|--------|
| `/admin` | ورود ادمین (بدون کروم فروشگاه) |
| `/admin/dashboard` | KPI + سفارش/پیام اخیر |
| `/admin/orders` · `[id]` | سفارش‌ها |
| `/admin/products` · `[id]` | محصولات |
| `/admin/sellers` · `[id]` | مدیریت فروشندگان (CRUD، تأیید حساب و محصول) |
| `/admin/categories` | دسته‌ها |
| `/admin/inventory` | موجودی |
| `/admin/customers` | مشتریان |
| `/admin/reviews` | نظرات |
| `/admin/coupons` | کوپن |
| `/admin/messages` | پیام تماس |
| `/admin/newsletter` | خبرنامه |
| `/admin/content` | محتوا |
| `/admin/reports` | گزارش + نمودار ۳۰ روز |
| `/admin/settings` | تنظیمات |

- کوکی: `hajiasal_admin_session`
- رمز: `ADMIN_PASSWORD`
- StoreChrome برای `/admin` غیرفعال است
- منوی موبایل سایدبار فعال است

## فروشنده (جدید)

| مسیر | کار |
|------|-----|
| `/seller` | ورود با موبایل + رمز |
| `/seller/dashboard` | KPI فروشنده |
| `/seller/orders` | سفارش‌های شامل محصولات فروشنده |
| `/seller/products` | کاتالوگ اختصاصی |
| `/seller/inventory` | toggle موجودی |
| `/seller/earnings` | درآمد و سهم |
| `/seller/settings` | پروفایل فروشگاه |

### دمو ورود فروشنده (فقط توسعه)
- موبایل: `09121111111` یا `09122222222`
- لوکال: `SELLER_DEMO_PASSWORD` در `.env.local`
- Production: فقط `SELLER_PASSWORD_S1` / `SELLER_PASSWORD_S2` (hashهای committed کار نمی‌کنند)

### داده
- جدول Supabase `sellers` (+ fallback: `sellers.json` / `sellers-runtime.json`)
- محصولات فروشنده: `products.seller_id` + `approval_status` (pending/approved/rejected)
- `src/hajiasal/data/seller-catalog.json` فقط fallback دمو تا وقتی فروشنده محصول اختصاصی ندارد
- کوکی: `hajiasal_seller_session`
- API: `/api/seller/*` و ادمین: `/api/admin/sellers`, `/api/admin/seller-products/[id]`

### قوانین تأیید
- حساب فروشنده: `pending | active | suspended | rejected`
- محصول فروشنده فقط پس از `approved` در فروشگاه عمومی دیده می‌شود
- ویرایش محتوای محصول توسط فروشنده دوباره وضعیت را `pending` می‌کند
- موجودی (inStock) بدون نیاز به تأیید مجدد قابل تغییر است
