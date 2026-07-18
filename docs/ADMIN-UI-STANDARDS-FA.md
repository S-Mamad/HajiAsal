# استانداردهای UI پنل ادمین

## جهت طراحی

Reading: پنل عملیاتی RTL برای تیم فروشگاه عسل، با زبان بصری هم‌خانواده برند (کرم/طلایی)، چگالی بالاتر از لندینگ، بدون بنفش AI.

## توکن‌ها (CSS)

- `--admin-bg`: `#f7f1e8`
- `--admin-surface`: `#ffffff`
- `--admin-ink`: `#1c1917`
- `--admin-muted`: `#78716c`
- `--admin-accent`: `#b8862e`
- `--admin-sidebar`: `#1c1917`
- `--admin-danger`: `#b91c1c`
- `--admin-success`: `#15803d`

فونت: Vazirmatn (بدنه)، اعداد `tabular-nums`.

## Layout

- Sidebar ثابت دسکتاپ، drawer موبایل
- Header: عنوان + Breadcrumb + Quick Action
- `min-h-[100dvh]`، RTL

## حالت‌ها (اجباری)

Loading skeleton، Empty state، Error قابل بازیابی، Success toast، Confirm برای حذف.

## آیکون

Phosphor ترجیح؛ Lucide فقط اگر از قبل استفاده شده.
