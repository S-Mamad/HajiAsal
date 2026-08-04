# سه اپ روی ساب‌دامین (فروشگاه / ادمین / فروشنده)

این پروژه **یک ریپو** است و روی هاست به **سه پوشه / سه Node App** با `APP_ROLE` جدا deploy می‌شود.

| نقش | پوشه پیشنهادی | دامنه | `APP_ROLE` |
|---|---|---|---|
| فروشگاه | `~/hajiasal` | `https://hajiasal.ir` | `storefront` |
| ادمین | `~/hajiasal-admin` | `https://admin.hajiasal.ir` | `admin` |
| فروشنده | `~/hajiasal-seller` | `https://seller.hajiasal.ir` | `seller` |

ورود ادمین و فروشنده فقط با **OTP موبایل** است. لاگین مشتری روی دامنه اصلی تغییر نکرده.

## DNS و cPanel

1. برای `admin` و `seller` رکورد A/CNAME به همان سرور بسازید.
2. در cPanel دو ساب‌دامین بسازید (document root می‌تواند همان Application root اپ Node باشد).
3. سه بار **Setup Node.js App**:
   - Application root: پوشه مربوطه
   - Application URL: دامنه مربوطه
   - Startup file: `server.js`
   - Node: 20 یا 22

## GitHub / Deploy

ریپو یکی است (`main`). روی هاست:

**روش پیشنهادی:** یک checkout از گیت + اسکریپت سه مسیره:

```bash
cd ~/hajiasal-src   # یا هر مسیر clone
git fetch && git reset --hard origin/main
bash scripts/cpanel-deploy-all.sh
```

مسیرها با env قابل تغییرند: `DEPLOY_STOREFRONT`, `DEPLOY_ADMIN`, `DEPLOY_SELLER`, `DEPLOY_SHARED_UPLOADS`.

اگر از Git Version Control سی‌پنل برای هر پوشه جدا استفاده می‌کنید، در `.cpanel.yml` فقط `DEPLOYPATH` را به پوشه همان اپ تغییر دهید و بعد از deploy یک‌بار `APP_ROLE` را در `.env` همان پوشه تنظیم کنید.

`.env` هرگز با rsync پاک/بازنویسی نمی‌شود.

## Symlink آپلود (اجباری)

عکس‌های ادمین/فروشنده باید روی فروشگاه هم دیده شوند:

```bash
mkdir -p ~/hajiasal-shared/uploads
ln -sfn ~/hajiasal-shared/uploads ~/hajiasal/public/uploads
ln -sfn ~/hajiasal-shared/uploads ~/hajiasal-admin/public/uploads
ln -sfn ~/hajiasal-shared/uploads ~/hajiasal-seller/public/uploads
```

اسکریپت `cpanel-deploy-all.sh` این لینک را هم می‌سازد (اگر از قبل پوشه غیر-symlink نباشد).

اختیاری برای JSON fallback: همین الگو برای `data/` اگر واقعاً لازم شد (production باید MySQL باشد).

## Env هر اپ

جزئیات متغیرها: `docs/ENV-SETUP-FA.md` و `.env.example`.

**مشترک هر سه:** `MYSQL_*`, `AUTH_SESSION_SECRET`, `SMS_*` / `MELIPAYAMAK_*`,  
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_SELLER_URL`, `TRUST_X_FORWARDED_FOR=true`

| فایل | اضافه |
|---|---|
| `~/hajiasal/.env` | `APP_ROLE=storefront` + درگاه پرداخت |
| `~/hajiasal-admin/.env` | `APP_ROLE=admin` + `ADMIN_PRIMARY_PHONES=09351925900,09135201973` |
| `~/hajiasal-seller/.env` | `APP_ROLE=seller` |

رمز عبور ادمین/فروشنده دیگر مسیر ورود نیست؛ `ADMIN_PASSWORD` / `SELLER_DEMO_PASSWORD` را در production نگذارید.

## آدرس‌ها بعد از استقرار

| چه | آدرس |
|---|---|
| فروشگاه | https://hajiasal.ir/ |
| ورود مشتری | https://hajiasal.ir/login |
| ادمین | https://admin.hajiasal.ir/ (rewrite به `/admin`) |
| فروشنده | https://seller.hajiasal.ir/ (rewrite به `/seller`) |

روی فروشگاه، مسیرهای `/admin` و `/seller` به ساب‌دامین ریدایرکت ۳۰۱ می‌شوند.

## ادمین‌های اصلی

با بالا آمدن پنل ادمین، شماره‌های `ADMIN_PRIMARY_PHONES` (پیش‌فرض دو شماره اصلی) به‌صورت `super_admin` و `active` seed می‌شوند. ورود فقط با OTP همان موبایل.

فروشنده باید در پنل ادمین با موبایل معتبر ساخته و `active` باشد؛ سپس OTP روی `seller.hajiasal.ir`.
