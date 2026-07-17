# راهنمای آپلود حاجی‌عسل روی هاست Node.js + MySQL
# دامنه: https://hajiasal.ir

## دیتابیس

این نسخه با **MySQL / MariaDB هاست** کار می‌کند (phpMyAdmin).

| چیز | استفاده |
|---|---|
| هاست Node.js | `node server.js` |
| MySQL هاست | سفارش، مشتری، OTP، کوپن، فروشنده |
| Supabase / Postgres | استفاده نمی‌شود |

---

## مرحله ۱: ساخت دیتابیس MySQL

1. در cPanel → MySQL Databases یک دیتابیس و یوزر بسازید و یوزر را به دیتابیس وصل کنید
2. phpMyAdmin → دیتابیس را انتخاب کنید
3. تب Import یا SQL → به ترتیب اجرا کنید (از پوشه `mysql-migrations` داخل زیپ):

```
001_schema.sql
002_seed_sellers.sql
```

جزئیات: `DATABASE-SQL-FA.md`

---

## مرحله ۲: Seed محصولات (یک‌بار از کامپیوتر)

```powershell
cd "f:\VS Code File\Mine Site\raxinshop"

$env:MYSQL_HOST="localhost"   # یا IP هاست اگر از راه دور اجازه دارید
$env:MYSQL_PORT="3306"
$env:MYSQL_DATABASE="نام_دیتابیس"
$env:MYSQL_USER="یوزر"
$env:MYSQL_PASSWORD="رمز"

npm run seed:products
npm run seed:coupons
npm run seed:site-settings
```

اگر remote MySQL روی هاست بسته است، فایل‌های SQL seed را از داخل phpMyAdmin هم می‌توانید بعداً دستی پر کنید؛ حداقل schema + sellers لازم است، بعد از ادمین محصول اضافه کنید یا seed را روی سروری با دسترسی DB بزنید.

---

## مرحله ۳: آپلود زیپ

1. `hajiasal-host-upload.zip` را آپلود و Extract کنید
2. ساختار:

```
hajiasal/
  server.js
  package.json
  .env
  public/
  .next/
  node_modules/
  data/
  mysql-migrations/
  README-UPLOAD-FA.md
  DATABASE-SQL-FA.md
  CREDENTIALS.txt
```

3. `.env` را باز کنید و فقط این‌ها را با اطلاعات MySQL هاست پر کنید:
   - `MYSQL_HOST` (معمولاً `localhost`)
   - `MYSQL_DATABASE`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`

دامنه و رمز ادمین/فروشنده از قبل برای `hajiasal.ir` آماده است (`CREDENTIALS.txt`).

---

## مرحله ۴: پنل Node.js

| تنظیم | مقدار |
|---|---|
| App directory | پوشه دارای `server.js` |
| Start | `node server.js` |
| Node | 20 یا 22 |

---

## آدرس‌ها

| چه | آدرس |
|---|---|
| فروشگاه | https://hajiasal.ir/hajiasal |
| `/` | ریدایرکت به `/hajiasal` |
| ادمین | https://hajiasal.ir/admin |
| فروشنده | https://hajiasal.ir/seller |

---

## عیب‌یابی

| مشکل | علت |
|---|---|
| سفارش/لاگین کار نمی‌کند | `MYSQL_*` اشتباه یا schema اجرا نشده |
| OTP نمی‌آید | لینک ملی‌پیامک |
| عکس‌ها نیست | پوشه `public` کنار `server.js` نباشد |

بعد از یادداشت رمزها، `CREDENTIALS.txt` را از هاست حذف کنید.
