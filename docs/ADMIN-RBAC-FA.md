# RBAC پنل ادمین حاجی‌عسل

## نقش‌ها

| نقش | کد | دامنه |
|-----|-----|--------|
| مدیر کل | `super_admin` | همه permissionها + کاربران ادمین + تنظیمات حساس |
| پشتیبان | `support` | سفارش، مشتری، تیکت، پیام، نظرات، Q&A |
| انباردار | `warehouse` | محصول (موجودی)، انبار، سفارش (ارسال/رهگیری) |
| محتوا | `content` | مقاله، بنر، صفحه، رسانه، دسته/برند محتوایی |

## Permissionها (دانه‌ای)

```
dashboard.view
products.view | products.create | products.edit | products.delete | products.bulk
categories.view | categories.manage
brands.view | brands.manage
orders.view | orders.edit | orders.refund | orders.print
customers.view | customers.edit
inventory.view | inventory.edit
sellers.view | sellers.manage
reviews.view | reviews.moderate
coupons.view | coupons.manage
messages.view | messages.manage
newsletter.view | newsletter.manage
articles.view | articles.manage
media.view | media.manage
banners.view | banners.manage
pages.view | pages.manage
qa.view | qa.manage
tickets.view | tickets.manage
notifications.view | notifications.manage
reports.view | reports.export
settings.view | settings.edit
logs.view
admin_users.view | admin_users.manage
```

## Bootstrap

- اگر جدول `admin_users` خالی باشد، ورود با `ADMIN_PASSWORD` یک کاربر `super_admin` می‌سازد (یا session legacy می‌دهد).
- پس از وجود حداقل یک کاربر، ورود با ایمیل/موبایل + رمز همان کاربر انجام می‌شود.

## سیاست‌ها

- فرانت فقط UI را مخفی می‌کند؛ امنیت واقعی در API است.
- `super_admin` همیشه `true` برای همه permissionها.
