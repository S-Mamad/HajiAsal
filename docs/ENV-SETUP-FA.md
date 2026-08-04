# راهنمای env — حاجی عسل (MySQL / cPanel)

> **امنیت:** هرگز رمز واقعی، session secret، یا کلید سرویس را داخل این فایل یا گیت نگذارید.

> موتور دیتابیس: **فقط MySQL/MariaDB** (نه Supabase/Postgres به‌عنوان موتور اصلی).  
> استقرار: هاست cPanel/Node — جزئیات در `docs/HOST-DEPLOY-FA.md` و **`docs/SUBDOMAIN-DEPLOY-FA.md`**.

## متغیرهای لازم

| متغیر | توضیح |
|--------|--------|
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | اتصال MySQL (یکسان روی هر سه اپ) |
| `APP_ROLE` | `storefront` / `admin` / `seller` — روی production سه پوشه؛ لوکال خالی = همه مسیرها |
| `NEXT_PUBLIC_SITE_URL` | آدرس فروشگاه بدون `/` انتهایی |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.hajiasal.ir` |
| `NEXT_PUBLIC_SELLER_URL` | `https://seller.hajiasal.ir` |
| `ADMIN_PRIMARY_PHONES` | شماره‌های ادمین اصلی، جدا با ویرگول (پیش‌فرض: `09351925900,09135201973`) |
| `AUTH_SESSION_SECRET` | کلید HMAC نشست مشتری (حداقل ۳۲ کاراکتر؛ یکسان روی هر سه اپ) |
| `AUTH_TEST_PHONE` / `AUTH_TEST_OTP` | **فقط توسعه**؛ در production غیرفعال اجباری |
| `SMS_PROVIDER` / `MELIPAYAMAK_OTP_URL` | OTP پیامک (ادمین، فروشنده، مشتری). پیش‌فرض: کانال OTP کنسول (سریع‌تر از پیامک آزاد) |
| `MELIPAYAMAK_BODY_ID` (+ اختیاری `MELIPAYAMAK_SHARED_URL` یا `MELIPAYAMAK_USERNAME`/`PASSWORD`) | الگو/سرویس مشترک — سریع‌ترین دلیوری OTP |
| `KAVENEGAR_OTP_TEMPLATE` / `GHASEDAK_OTP_TEMPLATE` | الگوی Verify برای کاوه‌نگار/قاصدک (به‌جای SMS آزاد) |
| `AUTH_OTP_IP_MAX` / `AUTH_OTP_PHONE_MAX` / `AUTH_OTP_COOLDOWN_SEC` / `AUTH_OTP_GLOBAL_HOURLY` | ضد‌اسپم کوتاه‌مدت |
| `AUTH_OTP_PHONE_DAILY` / `AUTH_OTP_IP_DAILY` / `AUTH_OTP_DEVICE_DAILY` | سقف روزانه پیامک موفق |
| `MELIPAYAMAK_SMS_URL` یا `SMS_API_KEY` / `SMS_SENDER` | پیامک دستی ادمین (اختیاری؛ برای OTP ترجیح داده نمی‌شود) |
| `ZARINPAL_MERCHANT_ID` / `ZARINPAL_ACCESS_TOKEN` | فقط فروشگاه — پرداخت/استرداد |
| `TRUST_X_FORWARDED_FOR` | معمولاً `true` پشت پروکسی cPanel |

ورود ادمین و فروشنده فقط OTP است؛ `ADMIN_PASSWORD` و `SELLER_*_PASSWORD` دیگر مسیر ورود production نیستند.

## Migration

فایل‌های `mysql-migrations/*.sql` را به ترتیب روی دیتابیس اجرا کنید (از جمله `002_admin_platform.sql` و `007_seller_panel.sql`).

## تست محلی

```bash
cp .env.example .env
# مقادیر MYSQL و AUTH را پر کنید؛ APP_ROLE را خالی بگذارید
npm install
npm run dev
npm run test
npm run test:e2e
```

برای جزئیات هاست و سه ساب‌دامین: `docs/SUBDOMAIN-DEPLOY-FA.md` و `.env.example`.
