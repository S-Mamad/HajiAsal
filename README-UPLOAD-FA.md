# آپلود روی هاست cPanel — حاجی‌عسل

مسیر اپ روی هاست شما: `/home/uabkxfzi/hajiasal`

## چرا زیپ قبلی کار نمی‌کرد؟

1. بیلد روی ویندوز ساخته شده بود؛ روی هاست لینوکس اجرا نمی‌شود.
2. در File Manager معمولاً پوشه‌های نقطه‌دار مثل `.next` و `.env` دیده نمی‌شوند مگر «Show Hidden Files» روشن باشد.
3. بدون `node_modules` و بدون بیلد لینوکس، `server.js` بالا نمی‌آید.
4. بدون فایل `.env` دیتابیس وصل نمی‌شود.

این زیپ فقط **سورس** است. بیلد باید **روی خود هاست** انجام شود.

## مراحل (به ترتیب)

### ۱) پاک‌سازی پوشه اپ
در File Manager برو به `/home/uabkxfzi/hajiasal` و این‌ها را پاک کن (اگر هست):
- `node_modules`
- `.next`
- فایل زیپ قدیمی

فایل `.env` را اگر از قبل درست پر کردی، **پاک نکن**.

### ۲) آپلود و Extract
1. `hajiasal-host-upload.zip` را داخل همان پوشه `hajiasal` آپلود کن
2. Extract کن (باید کنار `server.js` باز شود، نه داخل یک پوشه تو در تو)
3. زیپ را بعد از Extract حذف کن

بعد از Extract باید این‌ها را ببینی:
- `server.js`
- `package.json`
- `src/`
- `public/`
- `scripts/`
- `mysql-migrations/`

در Settings فایل‌منیجر، **Show Hidden Files** را روشن کن تا `.cpanel.yml` و `.env` را هم ببینی.

### ۳) دیتابیس (phpMyAdmin)
اگر قبلاً نزدی، به ترتیب Import کن:
1. `mysql-migrations/001_schema.sql` (یا معادل اسکیمای اصلی شما)
2. بقیه migrationهای قبلی
3. **حتماً:** `mysql-migrations/008_product_management_upgrade.sql`

### ۴) فایل `.env`
کنار `server.js` یک `.env` بساز:

```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SITE_URL=https://hajiasal.ir

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=نام_کامل_دیتابیس
MYSQL_USER=نام_کامل_یوزر
MYSQL_PASSWORD=رمز_دیتابیس

ADMIN_PASSWORD=رمز_قوی_ادمین
AUTH_SESSION_SECRET=یک_رشته_تصادفی_حداقل_۳۲_کاراکتر

SMS_PROVIDER=melipayamak
MELIPAYAMAK_OTP_URL=لینک_کنسول_ملی_پیامک

TRUST_X_FORWARDED_FOR=true
```

### ۵) Setup Node.js App
| تنظیم | مقدار |
|---|---|
| Application root | `hajiasal` |
| Application URL | `hajiasal.ir` |
| Application startup file | `server.js` |
| Node.js version | 20 یا 22 |

سپس:
1. **Run NPM Install**
2. در Terminal هاست:

```bash
cd ~/hajiasal
source ~/nodevenv/hajiasal/*/bin/activate
npm run build
mkdir -p tmp
touch tmp/restart.txt
```

اگر مسیر `nodevenv` فرق داشت، از پنل Node.js همان Activate را کپی کن.

### ۶) تست
- https://hajiasal.ir/
- https://hajiasal.ir/admin
- https://hajiasal.ir/seller

## عیب‌یابی سریع

| علامت | معنی |
|---|---|
| سایت سفید / 503 | Node App روشن نیست یا `touch tmp/restart.txt` نزدی |
| خطا بعد از Extract | زیپ داخل پوشه تو در تو باز شده |
| لاگین/سفارش کار نمی‌کند | `.env` یا migration ناقص است |
| عکس نیست | پوشه `public` کنار `server.js` نیست |
