# مشخصات پنل فروشنده حاجی‌عسل (Seller Spec)

> Reading: پنل عملیاتی RTL برای فروشندگان مارکت‌پلیس عسل؛ هم‌خانواده برند حاجی‌عسل؛ چگالی داده بالا؛ بدون بنفش AI.

## ورود و هویت

| مورد | مقدار |
|------|--------|
| مسیر ورود | `/seller` |
| کوکی | `hajiasal_seller_session` |
| منبع هویت | جدول `sellers` + `seller_sessions` |
| طول session | ۷ روز (قابل revoke) |
| StoreChrome | برای `/seller` غیرفعال |

وضعیت فروشنده (`pending` / `active` / `suspended` / `rejected`): فقط `active` وارد پنل می‌شود؛ بقیه پیام وضعیت می‌بینند.

## نقشه مسیرها (هدف)

### موجود (baseline)

| مسیر | نقش |
|------|-----|
| `/seller` | ورود |
| `/seller/dashboard` | داشبورد |
| `/seller/orders` | سفارش‌ها |
| `/seller/products` | محصولات |
| `/seller/inventory` | موجودی |
| `/seller/earnings` | درآمد (legacy؛ به Wallet مهاجرت می‌کند) |
| `/seller/settings` | تنظیمات فروشگاه |

### هدف کامل (۱۷ ماژول)

| # | ماژول | مسیر پایه | اولویت |
|---|--------|-----------|--------|
| 1 | داشبورد | `/seller/dashboard` | P0 |
| 2 | محصولات | `/seller/products` | P0 |
| 3 | سفارشات | `/seller/orders` | P0 |
| 4 | مشتریان | `/seller/customers` | P1 |
| 5 | موجودی | `/seller/inventory` | P0 |
| 6 | کیف پول | `/seller/wallet` (جایگزین earnings) | P0 |
| 7 | گزارش‌ها | `/seller/reports` | P1 |
| 8 | تیکت‌ها | `/seller/tickets` | P1 |
| 9 | اعلان‌ها | `/seller/notifications` | P1 |
| 10 | نظرات | `/seller/reviews` | P1 |
| 11 | پرسش و پاسخ | `/seller/qa` | P2 |
| 12 | تخفیف‌ها | `/seller/discounts` | P2 (capability) |
| 13 | پروفایل | `/seller/profile` | P1 |
| 14 | فایل‌ها | `/seller/media` | P1 |
| 15 | چاپ و خروجی | `/seller/print-export` | P2 |
| 16 | ابزارها | `/seller/tools` | P2 |
| 17 | تنظیمات فروشگاه | `/seller/settings` | P1 |

### قابلیت‌های سراسری (بدون صفحهٔ مستقل اجباری)

| قابلیت | مسیر / محل |
|--------|------------|
| Global Search | Command palette در Header (`⌘K` / `Ctrl+K`) |
| Notification Center | آیکون زنگوله در Header |
| Keyboard Shortcuts | Overlay راهنما (`?`) |
| Activity Log | `/seller/activity` + drawer در پروفایل |

مستندات تفصیلی: `SELLER-GLOBAL-FEATURES-FA.md` و `SELLER-MODULES-FA.md`.

## محدودیت نسبت به ادمین

فروشنده **نمی‌تواند**:

- محصولات فروشنده دیگر را ببیند/ویرایش کند
- سفارش‌هایی که هیچ آیتمی از او ندارند را ببیند
- کاربران ادمین، تنظیمات سراسری سایت، کوپن‌های سراسری، برند/دستهٔ سیستمی را مدیریت کند
- کمیسیون پلتفرم را تغییر دهد
- بدون capability از ادمین: SEO محصول، ساخت برند جدید، تخفیف/کمپین

فروشنده **می‌تواند** (در محدودهٔ خودش):

- CRUD محصول با وضعیت انتشار محدود (پیش‌نویس / ارسال برای تأیید / بایگانی)
- مدیریت سفارش‌های مرتبط، رهگیری، یادداشت فروشنده
- موجودی، کیف پول، گزارش، تیکت به ادمین، پاسخ نظر/Q&A

## فازبندی پیشنهادی

| فاز | محتوا | وضعیت |
|-----|--------|--------|
| F0 | Foundation: gate، shell، DataGrid، Global Search/Notif/Shortcuts، Activity | انجام‌شده |
| F1 | Products + Orders + Inventory + Dashboard + Wallet | انجام‌شده |
| F2 | Wallet + Customers + Profile + Settings + Notifications + Media | انجام‌شده |
| F3 | Reviews + Q&A + Tickets + Reports | انجام‌شده |
| F4 | Media + Tools + Print/Export + Discounts (capability) | انجام‌شده |

Migration: `mysql-migrations/007_seller_panel.sql` — قبل از استفادهٔ جداول جدید روی DB اجرا شود.

## خارج از محدوده این Spec

- ساخت انبوه API بدون نیاز UI
- تعویض موتور دیتابیس
- پنل موبایل native
- پرداخت درگاه داخل پنل فروشنده (فقط درخواست تسویه و نمایش وضعیت)

## مستندات مرتبط

- `SELLER-ARCHITECTURE-FA.md`
- `SELLER-RBAC-FA.md`
- `SELLER-UI-STANDARDS-FA.md`
- `SELLER-MODULE-CHECKLIST-FA.md`
- `SELLER-GLOBAL-FEATURES-FA.md`
- `SELLER-MODULES-FA.md`
- `CONTEXT-SELLER.md`
- پلن: `plans/hajiasal-seller/`
