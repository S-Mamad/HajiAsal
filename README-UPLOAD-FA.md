# آپلود روی هاست cPanel — حاجی‌عسل

مسیر اپ روی هاست شما: `/home/uabkxfzi/hajiasal`

## این زیپ چیست؟

`hajiasal-host-upload.zip` بستهٔ **آماده اجرا** است (بیلد داخلش هست).
نیازی به `npm install` یا `npm run build` نیست.

## مراحل (Extract و اجرا)

### ۱) پاک‌سازی و Extract
داخل `/home/uabkxfzi/hajiasal`:
- در صورت وجود، `node_modules` و `.next` قدیمی را پاک کنید
- زیپ را Extract کنید طوری که **کنار هم** این‌ها باشد:
  - `server.js`
  - `package.json`
  - `.next/` (با `standalone` داخلش)
  - `public/`
- نه داخل پوشهٔ تو در تو مثل `hajiasal/hajiasal/...`

در File Manager → Settings → **Show Hidden Files** را روشن کنید.

### ۲) متغیرهای محیطی
در **Setup Node.js App → Environment variables** همین‌ها را دارید؛ کافی است.
اگر خواستید فایل `.env` هم کنار `server.js` بسازید (از روی `.env.example`).

### ۳) تنظیمات Setup Node.js App

| تنظیم | مقدار |
|---|---|
| Application root | `hajiasal` |
| Application URL | `hajiasal.ir` |
| Application startup file | `server.js` |
| Node.js version | 22 (یا 20) |
| Application mode | Production |

### ۴) Restart
```bash
cd /home/uabkxfzi/hajiasal
mkdir -p tmp
touch tmp/restart.txt
```

در پنل Node.js هم می‌توانید Stop → Start بزنید.

### ۵) تست
- https://hajiasal.ir/
- https://admin.hajiasal.ir/ (پنل ادمین — ساب‌دامین)
- https://seller.hajiasal.ir/ (پنل فروشنده — ساب‌دامین)

مسیرهای قدیمی `hajiasal.ir/admin` و `/seller` باید به ساب‌دامین ریدایرکت شوند.
جزئیات سه اپ: `docs/SUBDOMAIN-DEPLOY-FA.md`

## اگر 503 دیدید

| علامت | کار |
|---|---|
| 503 بعد از Extract | `touch tmp/restart.txt` و Stop/Start اپ |
| Extract تو در تو | `server.js` باید مستقیم داخل `hajiasal` باشد |
| لاگین/سفارش خراب | `MYSQL_*` یا migration ناقص |
| عکس نیست | پوشه `public` کنار `server.js` نیست |

لاگ خطا معمولاً در stderr اپ Node یا فایل‌های error_log دامنه است.

## فقط در صورت خرابی بیلد (اختیاری)
اگر به هر دلیل `.next/standalone` کار نکرد:
```bash
source /home/uabkxfzi/nodevenv/hajiasal/22/bin/activate && cd /home/uabkxfzi/hajiasal
bash scripts/host-first-boot.sh
```
