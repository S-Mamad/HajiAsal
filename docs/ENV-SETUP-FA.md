# راهنمای env — حاجی عسل

> **امنیت:** هرگز رمز واقعی، session secret، یا کلید سرویس را داخل این فایل یا گیت نگذارید.
> اگر قبلاً مقدار واقعی در docs یا chat منتشر شده، فوراً در Vercel و Supabase **بچرخانید** (rotate).

## متغیرهای لازم

| متغیر | توضیح |
|--------|--------|
| `ADMIN_PASSWORD` | رمز قوی و یکتا برای پنل ادمین (حداقل ۱۶ کاراکتر تصادفی) |
| `AUTH_SESSION_SECRET` | کلید HMAC نشست مشتری — مثلاً `openssl rand -base64 48` |
| `AUTH_TEST_PHONE` / `AUTH_TEST_OTP` | فقط توسعه؛ در production غیرفعال اجباری است (کد ۶ رقمی) |
| `NEXT_PUBLIC_SITE_URL` | آدرس سایت بدون `/` انتهایی |
| `SMS_PROVIDER` | مثلاً `kavenegar` |
| `SELLER_PASSWORD_S1` / `SELLER_PASSWORD_S2` | **الزامی در production** برای ورود فروشنده‌های دمو |
| `SELLER_DEMO_PASSWORD` | فقط لوکال/توسعه |

فقط **۲ مقدار** را از Supabase می‌گیری: `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY`

---

## ۱) ساخت Supabase (۵ دقیقه)

1. برو [supabase.com](https://supabase.com) → Sign up / Login
2. **New project**
   - Name: `hajiasal`
   - Database password: یک رمز قوی (یادداشت کن)
   - Region: نزدیک‌ترین (مثلاً Frankfurt)
3. صبر کن تا پروژه Ready شود
4. منوی چپ → **SQL Editor** → **New query**
5. به ترتیب محتوای این فایل‌ها را paste و **Run** کن:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_auth_profiles.sql`
   - `supabase/migrations/003_admin_commerce.sql`
   - `supabase/migrations/004_coupons_extras.sql`
   - `supabase/migrations/005_seller_sessions.sql`
6. منوی چپ → **Project Settings** → **API**
   - **Project URL** → `SUPABASE_URL`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

---

## ۲) Seed دیتابیس (یک‌بار)

PowerShell:

```powershell
cd "f:\VS Code File\Mine Site\raxinshop"

$env:SUPABASE_URL="https://XXXX.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."

npm run seed:products
npm run seed:coupons
npm run seed:site-settings
```

---

## ۳) Vercel — Environment Variables

1. [vercel.com/dashboard](https://vercel.com/dashboard)
2. پروژه → **Settings** → **Environment Variables**
3. این‌ها را برای **Production** اضافه کن (مقادیر واقعی را خودت بساز):

```
NEXT_PUBLIC_SITE_URL = https://YOUR_DOMAIN
SUPABASE_URL = (از Supabase)
SUPABASE_SERVICE_ROLE_KEY = (از Supabase — service_role)
ADMIN_PASSWORD = (رمز قوی تصادفی)
AUTH_SESSION_SECRET = (openssl rand -base64 48)
SELLER_PASSWORD_S1 = (رمز قوی فروشنده ۱)
SELLER_PASSWORD_S2 = (رمز قوی فروشنده ۲)
SMS_PROVIDER = kavenegar
SMS_API_KEY = (کلید کاوه‌نگار)
SMS_SENDER = (خط ارسال)
```

موارد زیر را در Production **تنظیم نکن**:
- `AUTH_ALLOW_TEST_OTP`
- `AUTH_TEST_PHONE` / `AUTH_TEST_OTP`
- `SELLER_DEMO_PASSWORD`

4. **Deployments** → آخرین deploy → **Redeploy**

---

## ۴) تست بعد از deploy

| چه | کجا | با چه |
|----|-----|--------|
| ادمین | `/admin` | همان `ADMIN_PASSWORD` که در Vercel گذاشتی |
| فروشنده | `/seller` | موبایل دمو + `SELLER_PASSWORD_S1/S2` |
| مشتری | `/login` | OTP واقعی SMS (تست OTP در production کار نمی‌کند) |
| سلامت | `/admin/settings` | آماده‌بودن production |

---

## ۵) لوکال

کپی از `.env.example` به `.env.local` و تکمیل مقادیر. برای فروشنده در لوکال می‌توانی `SELLER_DEMO_PASSWORD` بگذاری.
