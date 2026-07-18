# امنیت و قابلیت‌های پنل فروشنده (Isolation + Capabilities)

## مدل امنیتی

برخلاف ادمین (چند نقش)، فروشنده **یک نقش ثابت** دارد: `seller`.
مرز امنیت = **مالکیت داده** (`seller_id`) نه ماتریس نقش‌های متعدد.

```
Session cookie → seller_id → همه queryها WHERE seller_id = ?
```

## گیت‌ها

| گیت | محل | رفتار |
|-----|------|--------|
| `getSellerFromCookies()` | Server Components / layout | null → redirect `/seller` |
| `requireSeller(request)` | API routes | 401 بدون session؛ 403 اگر status ≠ active |
| `assertSellerOwns(table, id, sellerId)` | قبل از update/delete/get by id | 404 (نه 403) برای جلوگیری از enumeration |
| `canSeller(seller, capability)` | UI + API | 403 اگر capability خاموش باشد |

## Capabilityها (از تنظیمات ادمین / فیلد seller)

```
products.manage          # پیش‌فرض true برای active
products.seo             # پیش‌فرض false — اجازه ادمین
products.brand_assign    # انتخاب برند موجود؛ ساخت برند = false
orders.manage
inventory.manage
wallet.view
wallet.withdraw
customers.view
reports.view
reports.export
tickets.manage
reviews.reply
qa.reply
discounts.manage         # پیش‌فرض false
media.manage
tools.import_export
settings.manage
notifications.view
print.export
```

پیشنهاد ذخیره‌سازی: ستون JSON `capabilities` روی `sellers` یا جدول `seller_capabilities`؛ ادمین از `/admin/sellers/[id]` فعال/غیرفعال می‌کند.

## سیاست‌های سخت

1. **IDOR ممنوع:** هر `GET/PUT/DELETE /api/seller/.../:id` باید ownership چک کند.
2. **لیست سفارش:** فقط سفارش‌هایی که حداقل یک `item` با `seller_id` فروشنده دارند؛ مبلغ‌ها فقط سهم فروشنده.
3. **مشتریان:** مشتق از سفارش‌های همان فروشنده؛ بدون نمایش کامل پروفایل کاربر پلتفرم فراتر از نیاز fulfillment.
4. **فایل‌ها:** مسیر آپلود زیر `seller/{sellerId}/...`؛ حذف فقط فایل‌های خود.
5. **فرانت فقط UI را مخفی می‌کند؛ امنیت واقعی در API است.**
6. **رمز:** scrypt؛ رد hashهای لو‌رفتهٔ شناخته‌شده (همان الگوی فعلی `sellers.ts`).

## Activity / Audit فروشنده

هر رویداد مهم:

| فیلد | توضیح |
|------|--------|
| `id` | UUID |
| `seller_id` | مالک |
| `actor_type` | `seller` (آینده: `admin_impersonate`) |
| `action` | مثلاً `product.update` |
| `entity_type` / `entity_id` | هدف |
| `meta` | JSON خلاصه تغییر |
| `ip` | از request |
| `user_agent` | اختیاری |
| `created_at` | زمان |

نمایش در `/seller/activity` فقط برای همان `seller_id`.

## جداول پیشنهادی (additive migration)

- `seller_activity_logs`
- `seller_notifications`
- `seller_saved_filters`
- `seller_withdrawals`
- `seller_wallet_ledger`
- `seller_tickets` (یا reuse تیکت ادمین با `seller_id`)
- گسترش `sellers`: logo, banner, address, bank fields, notification prefs, capabilities, shop settings JSON

STOP: اگر migration موتور را عوض کند یا FKهای موجود را بشکند.
