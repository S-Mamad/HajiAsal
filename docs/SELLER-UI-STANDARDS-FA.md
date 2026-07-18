# استانداردهای UI پنل فروشنده

## Design Read

پنل عملیاتی RTL برای فروشندگان مارکت‌پلیس عسل؛ زبان بصری هم‌خانواده برند (کرم/طلایی/سنگ تیره سایدبار)؛ چگالی بالاتر از لندینگ؛ بدون بنفش AI، بدون کارت تزئینی بی‌کاربرد.

Dial پیشنهادی پنل: `VARIANCE 4` / `MOTION 3` / `DENSITY 7` (cockpit داده، motion فقط برای feedback).

## توکن‌ها (CSS)

```css
--seller-bg: #f7f1e8;
--seller-surface: #ffffff;
--seller-ink: #1c1917;
--seller-muted: #78716c;
--seller-accent: #b8862e;
--seller-sidebar: #1c1714;
--seller-danger: #b91c1c;
--seller-success: #15803d;
--seller-warning: #b45309;
```

فونت: Vazirmatn (بدنه)، اعداد `tabular-nums` برای قیمت و موجودی.

## Layout

- Sidebar ثابت دسکتاپ (گروه‌بندی منو)، drawer موبایل
- Header: عنوان صفحه + Breadcrumb + Global Search trigger + Notification bell + Avatar/shop
- `min-h-[100dvh]`، RTL، `pb-[env(safe-area-inset-bottom)]` روی موبایل
- یک هدف در هر بخش لیست؛ KPIها فقط در داشبورد

## گروه‌بندی Sidebar (ترتیب)

1. داشبورد
2. فروش: محصولات، سفارشات، موجودی، مشتریان
3. مالی: کیف پول، گزارش‌ها
4. تعامل: تیکت‌ها، اعلان‌ها، نظرات، Q&A
5. رشد: تخفیف‌ها (اگر capability)
6. فروشگاه: پروفایل، فایل‌ها، چاپ و خروجی، ابزارها، تنظیمات
7. سیستم: تاریخچه فعالیت

Badge روی: سفارش‌های جدید، تیکت باز، اعلان نخوانده، موجودی کم.

## حالت‌ها (اجباری)

| حالت | الگو |
|------|------|
| Loading | Skeleton ردیف جدول / کارت KPI |
| Empty | تصویر/آیکون ملایم + یک جمله + CTA اصلی |
| Error | پیام قابل بازیابی + Retry |
| Success | Toast کوتاه |
| Warning | Banner درون‌صفحه برای موجودی کم / حساب ناقص |
| Confirm | Modal برای حذف / تسویه / آرشیو |

## Data Grid استاندارد

- Show/Hide columns (persist در `localStorage` per seller + module)
- Rows per page: ۱۰ / ۲۵ / ۵۰ / ۱۰۰
- Saved Filters (سرور: `seller_saved_filters`)
- Search + advanced filter drawer
- Row selection + Bulk bar
- Export / Print فقط selected (یا «همه نتایج فیلتر» با confirm دو مرحله‌ای)
- Drag reorder ستون اختیاری در فاز F1+

## آیکون و فرم

- Phosphor ترجیح؛ Lucide فقط اگر از قبل در همان فایل استفاده شده
- Label همیشه visible؛ Placeholder مکمل است نه جایگزین label
- خطای zod زیر فیلد؛ Tooltip برای قوانین کمیسیون/موجودی/SEO

## دسترس‌پذیری

- کنتراست حداقل ۴.۵:۱ برای متن بدنه
- Focus ring واضح؛ میانبرها با `aria-keyshortcuts`
- هدف لمسی ≥ ۴۴px در موبایل
- `prefers-reduced-motion` برای انیمیشن‌ها
