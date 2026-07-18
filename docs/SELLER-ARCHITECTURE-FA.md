# معماری پنل فروشنده حاجی‌عسل

## قفل‌ها

- دیتابیس فقط **MySQL/MariaDB** (migrationهای additive در `mysql-migrations/`)
- استک: Next.js App Router، React 19، Tailwind v4، mysql2، zod، Phosphor
- ارتقای پنل موجود `/seller`؛ فروشگاه عمومی و `/admin` دست‌نخورده مگر وابستگی مشترک آگاهانه
- **Tenant isolation اجباری:** هر ردیف دادهٔ فروشنده با `seller_id` فیلتر می‌شود؛ بدون این فیلتر هیچ query لیست/جزئیات مجاز نیست

## وضعیت فعلی → هدف

| لایه | الان | هدف |
|------|------|-----|
| مسیرها | ۶ صفحه اصلی | ۱۷ ماژول + صفحات فرعی (list/create/edit/detail) |
| Shell | Sidebar + Header ساده | Shell + Global Search + Notification + Shortcuts + Activity |
| Data Grid | لیست‌های ساده | ستون‌های قابل مخفی، saved filters، export انتخاب‌شده |
| امنیت | session کوکی | session + capability flags از ادمین + audit فروشنده |
| API | چند route پایه | Routeهای ماژول‌محور، نازک، با `requireSeller` |

## پوشه‌بندی هدف

```
src/
  app/seller/
    page.tsx                      # ورود
    (panel)/                      # layout auth
      layout.tsx
      dashboard/
      products/                   # list | new | [id] | [id]/edit
      orders/
      customers/
      inventory/
      wallet/
      reports/
      tickets/
      notifications/
      reviews/
      qa/
      discounts/
      profile/
      media/
      print-export/
      tools/
      settings/
      activity/
  app/api/seller/
    auth/
    search/                       # global search
    notifications/
    activity/
    <module>/                     # فقط وقتی UI نیاز دارد
  components/seller/
    layout/                       # Shell, Sidebar, Header, Breadcrumb, CommandPalette
    ui/                           # DataTable, Form, Modal, Toast, Empty, Skeleton
    global/                       # GlobalSearch, NotificationCenter, ShortcutsHelp
    modules/<name>/               # UI اختصاصی ماژول
  lib/seller/
    capabilities.ts               # فلگ‌های مجاز از تنظیمات ادمین
    nav.ts                        # منوی فیلترشده
    shortcuts.ts
    export/                       # reuse الگوی admin/export در صورت امکان
  lib/server/
    sellers.ts / sellers-store.ts # session + seller entity
    seller-gate.ts                # requireSeller + assertOwnership
    seller-activity.ts            # activity log
    repositories/seller/          # MySQL scoped به seller_id
```

## Seamهای اصلی (قابل تست بدون UI)

1. `getSellerFromCookies()` — هویت فروشنده
2. `requireSeller(request)` — گیت API؛ بدون session → ۴۰۱
3. `assertSellerOwns(resource, sellerId)` — جلوگیری از IDOR
4. `canSeller(seller, capability)` — قابلیت‌های اختیاری (تخفیف، SEO، برند، …)
5. Repositoryهای MySQL با `WHERE seller_id = ?` اجباری

## جریان درخواست

```
Browser → /seller/(panel)/* → layout: getSellerFromCookies → redirect login
Browser → /api/seller/* → requireSeller → assert ownership → repository → MySQL
```

## قوانین پایه

- Pagination اجباری روی همه لیست‌ها (پیش‌فرض ۲۵؛ گزینه‌ها: ۱۰/۲۵/۵۰/۱۰۰)
- Activity Log برای create/update/delete/login/withdraw/status-change
- Validation با zod در API و فرم
- Export/Print فقط روی ردیف‌های انتخاب‌شده (مگر صریحاً «همه فیلتر فعلی» با confirm)
- هیچ endpoint عمومی نباید دادهٔ فروشنده دیگر را لو بدهد حتی با حدس UUID

## اشتراک با پنل ادمین

| مشترک | نحوه |
|-------|------|
| توکن‌های برند (کرم/طلایی) | هم‌خانواده؛ prefix `--seller-*` جدا از `--admin-*` |
| DataTable / Export helpers | کپی کنترل‌شده یا extract به `components/shared/panel` فقط اگر هر دو پنل نیاز دارند |
| جداول محصولات/سفارشات | همان MySQL؛ scope با `seller_id` |
| تیکت/اعلان | جداول مشترک با فیلد `audience` یا جدول seller-scoped |

ادمین مدیریت فروشندگان را دارد؛ فروشنده هرگز به `/admin` یا API ادمین دسترسی ندارد.
