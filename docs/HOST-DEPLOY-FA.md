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
| App directory | پوشه دارای `server.js` (مثلاً `/home/uabkxfzi/hajiasal`) |
| Startup File | `server.js` |
| Start / Mode | Production |
| Node | 20 یا 22 |

---

## Deploy با Git Version Control (سی‌پنل)

فایل‌های `.cpanel.yml` و `scripts/cpanel-deploy.sh` و `server.js` برای Deploy آماده هستند.

1. در Git Version Control ریپو را به `main` جدید sync کن (`git fetch` + `git reset --hard origin/main` یا ریپو را دوباره Clone کن)
2. دکمه **Deploy HEAD Commit** را بزن
3. فایل‌ها به `/home/uabkxfzi/hajiasal` کپی می‌شوند و در صورت وجود `npm`، build اجرا می‌شود
4. در **Setup Node.js App**:
   - Application root: `hajiasal`
   - Application URL: دامنه `hajiasal.ir`
   - Application startup file: `server.js`
5. یک‌بار `.env` را داخل `/home/uabkxfzi/hajiasal/.env` بساز (از روی `.env.example`)؛ Deploy آن را پاک نمی‌کند
6. اگر build روی Deploy خطا داد: از همان پنل Node.js → Run NPM Install، بعد در Terminal داخل اپ:
   ```bash
   source ~/nodevenv/hajiasal/.../bin/activate   # اگر وجود دارد
   cd ~/hajiasal
   npm run build
   touch tmp/restart.txt
   ```

---

## آدرس‌ها

| چه | آدرس |
|---|---|
| فروشگاه | https://hajiasal.ir/ |
| ادمین | https://hajiasal.ir/admin |
| فروشنده | https://hajiasal.ir/seller |

---

## عیب‌یابی

| مشکل | علت |
|---|---|
| سفارش/لاگین کار نمی‌کند | `MYSQL_*` اشتباه یا schema اجرا نشده |
| OTP نمی‌آید | لینک ملی‌پیامک |
| عکس‌ها نیست | پوشه `public` کنار `server.js` نباشد |
| Deploy در سی‌پنل خطا می‌دهد | اول `reset --hard origin/main`؛ `.cpanel.yml` باید در ریشه باشد |

بعد از یادداشت رمزها، `CREDENTIALS.txt` را از هاست حذف کنید.
