# آپلود روی هاست cPanel — حاجی‌عسل

مسیر اپ روی هاست شما: `/home/uabkxfzi/hajiasal`

## علت 503

کد `503` یعنی اپ Node بالا نیامده یا موقع استارت کرش کرده.

رایج‌ترین علت با این زیپ:
1. فقط سورس آپلود شده
2. **`npm run build` روی هاست اجرا نشده** (پوشه `.next` نیست)
3. یا بعد از بیلد، اپ Restart نشده (`touch tmp/restart.txt`)

## مراحل سریع (ترتیب مهم است)

### ۱) پاک‌سازی و Extract
داخل `/home/uabkxfzi/hajiasal`:
- `node_modules` و `.next` قدیمی را پاک کن (اگر هست)
- `hajiasal-host-upload.zip` را Extract کن طوری که **کنار هم** این‌ها باشد:
  - `server.js`
  - `package.json`
  - `src/`
  - `public/`
  - `scripts/`
- نه داخل پوشهٔ تو در تو مثل `hajiasal/hajiasal/...`

در File Manager → Settings → **Show Hidden Files** را روشن کن.

### ۲) متغیرهای محیطی
در **Setup Node.js App → Environment variables** همین‌ها را داری؛ کافی است.
اگر خواستی فایل `.env` هم کنار `server.js` بساز (اختیاری وقتی متغیرها در پنل هست).

### ۳) بیلد روی هاست (اجباری)

در **Terminal** سی‌پنل:

```bash
source /home/uabkxfzi/nodevenv/hajiasal/22/bin/activate && cd /home/uabkxfzi/hajiasal
bash scripts/host-first-boot.sh
```

یا دستی:

```bash
source /home/uabkxfzi/nodevenv/hajiasal/22/bin/activate && cd /home/uabkxfzi/hajiasal
npm install --no-audit --no-fund
npm run build
mkdir -p tmp
touch tmp/restart.txt
```

در پنل Node.js هم می‌توانی اول **Run NPM Install** بزنی، بعد فقط `npm run build` و `touch tmp/restart.txt`.

### ۴) تست
- https://hajiasal.ir/
- https://hajiasal.ir/admin
- https://hajiasal.ir/seller

## تنظیمات Setup Node.js App

| تنظیم | مقدار |
|---|---|
| Application root | `hajiasal` |
| Application URL | `hajiasal.ir` |
| Application startup file | `server.js` |
| Node.js version | 22 (یا 20) |
| Application mode | Production |

## عیب‌یابی

| علامت | معنی |
|---|---|
| 503 | بیلد نشده / اپ Stop است / بعد از بیلد restart نزدی |
| Extract تو در تو | `server.js` باید مستقیم داخل `hajiasal` باشد |
| لاگین/سفارش خراب | `MYSQL_*` یا migration ناقص |
| عکس نیست | پوشه `public` کنار `server.js` نیست |

لاگ خطا معمولاً در stderr اپ Node یا فایل‌های error_log دامنه است.
