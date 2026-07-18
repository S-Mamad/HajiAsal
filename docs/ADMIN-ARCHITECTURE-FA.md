# معماری پنل ادمین حاجی‌عسل

## قفل‌ها

- دیتابیس فقط **MySQL/MariaDB** (migrationهای additive در `mysql-migrations/`)
- استک: Next.js App Router، React 19، Tailwind v4، mysql2، zod، Phosphor
- ارتقای پنل موجود؛ فروشگاه عمومی و `/seller` دست‌نخورده مگر وابستگی مشترک

## پوشه‌بندی

```
src/
  app/admin/(panel)/          # صفحات پنل
  app/api/admin/              # Route handlers
  components/admin/
    layout/                   # Shell, Sidebar, Header, Breadcrumb
    ui/                       # DataTable, Form, Modal, Toast, Empty
    modules/<name>/           # UI اختصاصی ماژول
  lib/admin/
    permissions.ts            # ماتریس + can()
    nav.ts                    # منوی فیلترشده
    export/                   # CSV / Excel / PDF / Print
  lib/server/
    admin.ts / admin-auth.ts  # session + user + role
    admin-audit.ts            # audit log
    repositories/admin/       # دسترسی MySQL
```

## Seamهای اصلی

1. `can(role, permission)` — تست‌پذیر بدون UI
2. `requireAdminPermission(request, permission)` — گیت API
3. Repositoryهای MySQL per domain — بدون Prisma/ORM خارجی

## جریان درخواست

```
Browser → /admin/(panel)/* → layout auth check
Browser → /api/admin/* → requireAdminPermission → repository → MySQL
```

## قوانین پایه

- هر route ادمین باید permission داشته باشد
- Pagination اجباری روی لیست‌ها
- Audit برای create/update/delete/login
- Validation با zod در API و فرم
