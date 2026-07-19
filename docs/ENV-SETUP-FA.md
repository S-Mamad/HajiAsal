# راهنمای env — حاجی عسل (MySQL / cPanel)

> **امنیت:** هرگز رمز واقعی، session secret، یا کلید سرویس را داخل این فایل یا گیت نگذارید.

> موتور دیتابیس: **فقط MySQL/MariaDB** (نه Supabase/Postgres به‌عنوان موتور اصلی).  
> استقرار: هاست cPanel/Node — جزئیات در `docs/HOST-DEPLOY-FA.md`.

## متغیرهای لازم

| متغیر | توضیح |
|--------|--------|
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | اتصال MySQL |
| `ADMIN_PASSWORD` | رمز قوی برای bootstrap پنل ادمین |
| `AUTH_SESSION_SECRET` | کلید HMAC نشست مشتری (حداقل ۳۲ کاراکتر تصادفی) |
| `AUTH_TEST_PHONE` / `AUTH_TEST_OTP` | **فقط توسعه**؛ در production غیرفعال اجباری |
| `NEXT_PUBLIC_SITE_URL` | آدرس سایت بدون `/` انتهایی |
| `SMS_PROVIDER` / `MELIPAYAMAK_OTP_URL` | OTP پیامک |
| `ZARINPAL_MERCHANT_ID` | اختیاری — پرداخت آنلاین |
| `SELLER_DEMO_PASSWORD` / `SELLER_PASSWORD_S1` | ورود فروشندگان دمو/عملیاتی |
| `SELLER_DEMO_PHONE` | اختیاری برای E2E پنل فروشنده |

## Migration

فایل‌های `mysql-migrations/*.sql` را به ترتیب روی دیتابیس اجرا کنید (از جمله `002_admin_platform.sql` و `007_seller_panel.sql`).

## تست محلی

```bash
cp .env.example .env
# مقادیر MYSQL و AUTH را پر کنید
npm install
npm run dev
npm run test
npm run test:e2e
```

برای جزئیات هاست: `docs/HOST-DEPLOY-FA.md` و `.env.example`.
