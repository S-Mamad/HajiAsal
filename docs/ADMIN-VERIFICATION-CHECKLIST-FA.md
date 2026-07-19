# چک‌لیست تأیید پنل ادمین حاجی‌عسل

تاریخ ممیزی: ۲۰۲۶-۰۷-۱۸  
پروژه: `site/hajiasal`  
موتور دیتابیس: MySQL (بدون تغییر)  
تأیید کامپایل: `npx tsc --noEmit` → Exit 0

راهنما: هر ردیف یا «موجود در کد» است یا «نیاز به اقدام روی سرور/دستی».

---

## A) قفل‌های پایه (غیرقابل مذاکره)

| # | مورد | وضعیت | مسیر/شواهد |
|---|------|--------|------------|
| A1 | دیتابیس فقط MySQL/MariaDB | OK | `mysql2` + `src/lib/server/mysql.ts` |
| A2 | بدون Prisma/Convex/Postgres به‌عنوان موتور اصلی | OK | migrationهای SQL در `mysql-migrations/` |
| A3 | ارتقای پنل موجود (نه rewrite کل فروشگاه) | OK | مسیرهای `/admin` حفظ + گسترش |
| A4 | پنل فروشنده جدا مانده | OK | `/seller` + `CONTEXT-SELLER.md` |
| A5 | استک Next/React/Tailwind/zod/Phosphor | OK | `package.json` |

---

## B) مستندات و پلن

| # | مورد | وضعیت | مسیر |
|---|------|--------|------|
| B1 | معماری ادمین | OK | `docs/ADMIN-ARCHITECTURE-FA.md` |
| B2 | RBAC | OK | `docs/ADMIN-RBAC-FA.md` |
| B3 | استاندارد UI | OK | `docs/ADMIN-UI-STANDARDS-FA.md` |
| B4 | چک‌لیست ۱۸ مرحله‌ای ماژول | OK | `docs/ADMIN-MODULE-CHECKLIST-FA.md` |
| B5 | مشخصات مسیرها | OK | `docs/ADMIN-SPEC.md` |
| B6 | پلن foundation/modules | OK | `plans/hajiasal-admin/00-foundation.md`, `01-modules.md` |
| B7 | CONTEXT ادمین | OK | `CONTEXT-ADMIN.md` |
| B8 | راهنمای SQL به‌روز با migration جدید | OK | `docs/DATABASE-SQL-FA.md` (ردیف `002_admin_platform.sql`) |

---

## C) Foundation (کد)

| # | مورد | وضعیت | مسیر |
|---|------|--------|------|
| C1 | ماتریس permission + نقش‌ها | OK | `src/lib/admin/permissions.ts` |
| C2 | منوی فیلترشده با نقش | OK | `src/lib/admin/nav.ts` |
| C3 | Export CSV/Excel/Print | OK | `src/lib/admin/export/index.ts` |
| C4 | Auth چندکاربره + bootstrap | OK | `src/lib/server/admin-auth.ts` |
| C5 | Session با `admin_user_id` | OK | `src/lib/server/admin-sessions.ts` |
| C6 | `gateAdmin` / `requireAdminPermission` | OK | `src/lib/server/admin-gate.ts` |
| C7 | Audit log | OK | `src/lib/server/audit-log.ts` |
| C8 | Store پلتفرم (برند/مقاله/…) | OK | `src/lib/server/admin-platform-store.ts` |
| C9 | AdminAuthProvider + `<Can>` | OK | `src/components/admin/auth/AdminAuthProvider.tsx` |
| C10 | Layout + Sidebar گروه‌بندی + Header/Breadcrumb | OK | `layout/AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx` |
| C11 | DataTable v2 (search/sort/select/bulk/hide/pagination) | OK | `ui/DataTable.tsx` |
| C12 | Form kit | OK | `ui/AdminForm.tsx` |
| C13 | Modal + Confirm | OK | `ui/AdminModal.tsx` |
| C14 | Toast | OK | `ui/AdminToast.tsx` |
| C15 | CRUD helper | OK | `ui/AdminCrudList.tsx`, `modules/AdminSimpleModulePage.tsx` |
| C16 | Login چندفیلدی | OK | `AdminLogin.tsx` + `api/admin/auth` |
| C17 | Middleware گیت کوکی پنل | OK | `src/middleware.ts` |

---

## D) Migration MySQL

| # | مورد | وضعیت | توضیح |
|---|------|--------|--------|
| D1 | فایل `002_admin_platform.sql` در ریپو | OK | `mysql-migrations/002_admin_platform.sql` |
| D2 | جداول: `admin_users`, `brands`, `articles`, `media_assets`, `banners`, `cms_pages`, `product_questions`, `support_tickets`, `ticket_messages`, `notifications`, `customer_wallets`, `wallet_transactions`, `customer_admin_notes` | OK در فایل | باید روی دیتابیس واقعی Paste شود |
| D3 | گسترش `admin_sessions` / `admin_audit_log` / `products` / `orders` / reviews / contact | OK در فایل | additive |
| D4 | **اجرا روی هاست/phpMyAdmin** | اقدام شما | تا اجرا نشود، جداول جدید در DB خالی‌اند |

---

## E) امنیت API

| # | مورد | وضعیت |
|---|------|--------|
| E1 | همه routeهای `/api/admin/*` (به‌جز login) از `gateAdmin` استفاده می‌کنند | OK (۳۲+ فایل، بدون `isAdminRequestAuthenticatedAsync` در admin API) |
| E2 | `auth` برای ورود بدون gate (عمدی) | OK |
| E3 | Permission دانه‌ای per method (view/edit/manage) | OK |
| E4 | TypeScript بدون خطای کامپایل | OK (`tsc --noEmit` Exit 0) |

---

## F) صفحات پنل (`/admin/(panel)/*`) — موجود در پروژه

| # | ماژول | صفحه | API |
|---|--------|-------|-----|
| F1 | داشبورد | `dashboard/page.tsx` | `api/admin/dashboard` |
| F2 | محصولات لیست | `products/page.tsx` | `api/admin/products` |
| F3 | محصول جدید | `products/new/page.tsx` | POST products |
| F4 | ویرایش محصول | `products/[id]/page.tsx` | `products/[id]` |
| F5 | دسته‌ها | `categories/page.tsx` | `categories` |
| F6 | برندها | `brands/page.tsx` | `brands` |
| F7 | موجودی | `inventory/page.tsx` | `inventory` |
| F8 | فروشندگان | `sellers`, `sellers/[id]` | `sellers`, `seller-products`, `withdrawals` |
| F9 | سفارش‌ها | `orders`, `orders/[id]` | `orders` (+ رهگیری/یادداشت/بازپرداخت/فاکتور) |
| F10 | مشتریان | `customers`, `customers/[id]` | wallet/notes/addresses |
| F11 | کوپن | `coupons/page.tsx` | `coupons` |
| F12 | نظرات | `reviews/page.tsx` | تأیید/رد/پاسخ |
| F13 | پیام‌ها | `messages/page.tsx` | `messages` |
| F14 | خبرنامه | `newsletter/page.tsx` | `newsletter` |
| F15 | مقالات | `articles/page.tsx` | `articles` |
| F16 | صفحات CMS | `pages/page.tsx` | `pages` |
| F17 | بنرها | `banners/page.tsx` | `banners` |
| F18 | رسانه | `media/page.tsx` | `media` |
| F19 | محتوا سریع | `content/page.tsx` | `content` |
| F20 | Q&A | `qa/page.tsx` | `qa` |
| F21 | تیکت | `tickets/page.tsx` | `tickets` |
| F22 | اعلان‌ها | `notifications/page.tsx` | `notifications` |
| F23 | کاربران پنل | `users/page.tsx` | `users` |
| F24 | گزارش‌ها | `reports/page.tsx` | `reports` + Export |
| F25 | لاگ سیستم | `logs/page.tsx` | `logs` |
| F26 | تنظیمات | `settings/page.tsx` | `settings` |

جمع صفحات پنل: **۲۹** فایل `page.tsx` زیر `(panel)`.

---

## G) تست E2E موجود

| # | فایل | وضعیت |
|---|------|--------|
| G1 | `e2e/hajiasal-admin-auth.spec.ts` | OK |
| G2 | `e2e/hajiasal-admin-orders.spec.ts` | OK |
| G3 | `e2e/hajiasal-admin-platform.spec.ts` | OK |

اجرای واقعی: `npm run test:e2e` با `ADMIN_PASSWORD` در env.

---

## H) چک دستی پیشنهادی (بعد از migration)

- [ ] Paste کردن `002_admin_platform.sql` روی MySQL هاست
- [ ] ورود با `ADMIN_PASSWORD` → ساخت/ورود super_admin
- [ ] داشبورد KPI و نمودار لود می‌شود
- [ ] محصولات: جستجو، bulk، ایجاد، ویرایش
- [ ] سفارش: تغییر وضعیت، رهگیری، چاپ فاکتور، بازپرداخت
- [ ] مشتری: کیف پول + یادداشت
- [ ] کاربران پنل: ساخت نقش support و تست مخفی شدن منو
- [ ] برند / مقاله / بنر / صفحه / رسانه: CRUD
- [ ] نظرات: تأیید + پاسخ
- [ ] Q&A / تیکت / اعلان / لاگ
- [ ] گزارش Export
- [ ] بدون کوکی، `/admin/dashboard` ریدایرکت به `/admin`

---

## I) محدودیت‌های صادقانه (کد هست، عمق کامل سند اولیه نیست)

این‌ها **باگ نیستند**؛ فاصله از «همه فیلدهای ۱۸ مرحله‌ای هر ماژول ۱۰۰٪»:

| مورد | توضیح |
|------|--------|
| فرم ویرایش محصول | فیلدهای پایه هست؛ SKU/برند/SEO/تخفیف زمانی در DB آماده است ولی UI ویرایش کامل همه فیلدهای عسل هنوز گسترش‌پذیر است |
| ارسال واقعی SMS/ایمیل سفارش | ثبت وضعیت/یادداشت هست؛ اتصال زنده به API پیامک/SMTP بسته به env تنظیمات |
| آپلود باینری رسانه | ثبت URL/متادیتا؛ آپلود فایل خام به دیسک می‌تواند فاز بعدی باشد |
| تیکت ضمیمه فایل | مدل پیام/ضمیمه در DB هست؛ UI ضمیمه کامل می‌تواند غنی‌تر شود |

---

## J) حکم نهایی

| معیار | نتیجه |
|--------|--------|
| همه deliverableهای پلن در **ریپوی همین پروژه** هستند | بله |
| کامپایل TypeScript سالم | بله (`tsc` Exit 0) |
| API ادمین با permission gate | بله |
| MySQL بدون تعویض موتور | بله |
| آماده استفاده عملیاتی کامل روی سرور | بعد از اجرای `002_admin_platform.sql` + تست دستی بخش H |

**خلاصه:** کارهای گذشته در `site/hajiasal` پیاده و سالم‌اند. تنها اقدام اجباری باقی‌مانده روی محیط واقعی، اجرای migration `002` و smoke دستی بخش H است.
