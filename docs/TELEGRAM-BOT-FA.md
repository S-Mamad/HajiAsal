# ربات تلگرام اعلان حاجی‌عسل

**موجودی صادقانه وضعیت فعلی (چه می‌کند / چه نمی‌کند):** [`TELEGRAM-BOT-AS-IS-FA.md`](./TELEGRAM-BOT-AS-IS-FA.md)

این صفحه راهنمای راه‌اندازی و env است. اعلان‌ها از صف MySQL (`telegram_outbox`) می‌روند؛ قیف سبد وجود ندارد.

اعلان لحظه‌ای رویدادهای فروشگاه به چت‌های ادمین، دستورات آماری، گزارش روزانه.

## پیش‌نیاز ایران (مهم)

از ایران/`api.telegram.org` معمولاً روی هاست بسته است. باید **Cloudflare Worker** پروکسی را deploy کنید:

→ راهنما: [`workers/telegram-proxy/README.md`](../workers/telegram-proxy/README.md)

```bash
cd workers/telegram-proxy
npx wrangler login
npx wrangler secret put PROXY_SECRET
npx wrangler deploy
```

آدرس خروجی را در env بگذارید: `TELEGRAM_API_BASE_URL=https://....workers.dev`

## پیش‌نیاز بات

1. ساخت بات در [@BotFather](https://t.me/BotFather) با `/newbot` و کپی توکن.
2. افزودن بات به گروه تیم و گرفتن Chat ID.
3. یک `TELEGRAM_WEBHOOK_SECRET` و یک `TELEGRAM_PROXY_SECRET` تصادفی بسازید.

## متغیرهای محیطی

### ادمین (صاحب توکن و webhook)

```env
TELEGRAM_NOTIFY_ENABLED=true
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_ADMIN_CHAT_IDS=-100...,123456789
TELEGRAM_WEBHOOK_SECRET=long_random_secret_here
CRON_SECRET=same_shared_secret_min_32

# پروکسی Cloudflare (الزامی در ایران)
TELEGRAM_API_BASE_URL=https://hajiasal-telegram-proxy.YOUR_SUBDOMAIN.workers.dev
TELEGRAM_PROXY_SECRET=same_as_worker_PROXY_SECRET

# اختیاری — فقط تیکت جدید. کلید را در ریپو نگذارید.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash-lite
```

### استورفرانت / فروشنده (بدون توکن)

توکن فقط روی ادمین است. فروشگاه همان `MYSQL_*` را دارد و بعد از INSERT می‌تواند ورکر ادمین را بیدار کند:

```env
CRON_SECRET=same_shared_secret_as_admin
# TELEGRAM_OUTBOX_WAKE_URL=https://admin.hajiasal.ir/api/cron/telegram-outbox
# TELEGRAM_NOTIFY_ENABLED و BOT_TOKEN را اینجا نگذارید
```

- بدون MySQL مشترک → اعلان فروشگاه نوشته نمی‌شود (`skipped`).
- توکن را commit نکنید.
- فقط chatهای whitelist دستورات و دکمه‌های سفارش را می‌گیرند.
- مسیر HTTP کاربر هرگز منتظر تلگرام نمی‌ماند (فقط INSERT).

## لایه الرت

| اولویت | رویدادها | نحوه ارسال |
|--------|----------|------------|
| فوری | ورود/ثبت‌نام، **ورود کد تخفیف**، **فعال شدن کوپن روی سفارش**، سفارش جدید، درگاه، پرداخت موفق/ناموفق، خطا، تیکت، تماس، فروشنده | INSERT در outbox؛ ورکر ادمین می‌فرستد |
| خاموش | افزودن به سبد / خلاصه ۵ دقیقه‌ای | در کد نیست |

تیکت جدید روی ورکر با Gemini Flash-Lite خلاصه می‌شود؛ اگر کلید نباشد یا فراخوانی بشکند، همان متن خام می‌رود.

## ضداسپم درگاه

برای زیبال و اسنپ‌پی:

- اگر برای همان سفارش + همان مبلغ، مرجع درگاه تازه (≤ ۱۵ دقیقه) وجود دارد → همان لینک برگردانده می‌شود (درگاه جدید ساخته نمی‌شود).
- ساخت واقعی: حداکثر ۳ بار / سفارش / ۵ دقیقه و ۸ بار / کاربر / ۱۵ دقیقه.
- قفل per-order برای کلیک هم‌زمان.

## آمار (دقت مبلغ)

- فروش فقط از سفارش‌های پرداخت‌شده (`confirmed` و بعد؛ بدون `pending_payment` / `cancelled` / استردادشده).
- مرز روز/هفته/ماه با تقویم **Asia/Tehran** (روزهای تقویمی، نه فقط کم‌کردن ۲۴ساعت UTC).
- مبالغ در پیام‌ها با واحد **تومان** (`formatPrice`).
- **میانگین سبد امروز** = فروش امروز ÷ تعداد سفارش پرداخت‌شده امروز.
- **میانگین سبد کل** = میانگین عمری سفارش‌های پرداخت‌شده (جدا برچسب می‌خورد).
- **در انتظار پرداخت** به دو بخش تقسیم می‌شود: تازه (≤۲۴ ساعت) و کهنه (>۲۴ ساعت) تا سبدهای رهاشده گزارش را جعلی نشان ندهند.

## رویدادهای اعلان

| رویداد | توضیح |
|--------|--------|
| auth.otp_requested | درخواست SMS کد ورود (با rate-limit؛ هنوز وارد نشده) |
| auth.login / auth.register | تأیید موفق OTP |
| coupon.applied (typed) | کاربر کد را در سبد زد؛ فوری، بدون کند کردن صفحه |
| coupon.applied (checkout) | همان کد روی سفارش قفل شد (با شناسه سفارش) |
| coupon.rejected | کد نامعتبر در سبد یا تسویه |
| order.created | ساخت سفارش در انتظار پرداخت |
| payment.create / reuse / spam_blocked | چرخه درگاه |
| پرداخت موفق | بعد از `confirmPaidOrder` |
| کمبود موجودی | بعد از فروش |
| تغییر وضعیت / لغو / استرداد | پنل |
| پرداخت ناموفق | verify زیبال / اسنپ‌پی |
| api.error_critical | خطای ۵۰۰ مسیرهای حیاتی |
| پیام تماس / خبرنامه / فروشنده / تیکت جدید | مثل قبل |
| ticket.reply | پاسخ مشتری روی تیکت باز |
| review.created | نظر جدید خریدار |
| digest | گزارش روزانه cron |

## Webhook دستورات

مسیر: `POST /api/telegram/webhook` (فقط `APP_ROLE=admin` یا local/`all`)

ثبت webhook **از طریق ورکر**:

```bash
curl -fsS -X POST \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Proxy-Secret: $TELEGRAM_PROXY_SECRET" \
  "$TELEGRAM_API_BASE_URL/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "{\"url\":\"https://admin.hajiasal.ir/api/telegram/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\"}"
```

دستورات:

- `/today` `/digest` `/stats` `/orders` `/pending` `/failed` `/lowstock`
- `/order <id>` `/search <phone|orderId>`
- `/alerts` `/help`

روی `order.created` دکمه لغو (فقط در انتظار پرداخت) و روی `order.paid` دکمه آماده‌سازی هست. دکمه «پرداخت شد» بدون درگاه وجود ندارد.

امنیت: webhook secret fail-closed، whitelist chat، محدودیت `/search`، ماسک تلفن. Webhook همان لحظه ۲۰۰ می‌دهد.

## Cron

```bash
# هر دقیقه روی ادمین — صف outbox
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://admin.hajiasal.ir/api/cron/telegram-outbox

# روزانه (ترجیحاً ~۲۳:۵۵ تهران) — یک‌بار در هر روز تقویم تهران
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://admin.hajiasal.ir/api/cron/telegram-digest

# ارسال مجدد همان روز (فقط در صورت نیاز)
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://admin.hajiasal.ir/api/cron/telegram-digest?force=1"
```

کرون `telegram-funnel-flush` حذف شده است. گزارش روزانه تکراری همان روز را با کلید `telegram_digest_state` در `site_settings` بلاک می‌کند.
## الرت آپدیت پروداکشن

بعد از هر دیپلوی موفق، **خلاصه تغییرات واقعی** به تلگرام ادمین می‌رود:

- اسکریپت: `scripts/telegram-deploy-notify.mjs`
- اندپوینت: `POST /api/cron/telegram-deploy-notify` (Bearer `CRON_SECRET`)
- از `cpanel-deploy.sh` و `cpanel-deploy-all.sh` صدا زده می‌شود
- خلاصه از این منابع (به ترتیب اولویت):
  1. `--lines "..."` دستی
  2. `DEPLOY_SUMMARY` در env
  3. فایل `data/deploy-changelog.txt` (قبل از آپلود روی ماشین توسعه بسازید)
  4. diff گیت نسبت به آخرین SHA ارسال‌شده → حوزه‌های فارسی (بدون دیوار commit انگلیسی)
  5. اگر git روی هاست نباشد و فایل changelog نباشد: راهنمای ساخت changelog

قبل از ساخت پکیج هاست (روی ویندوز/لپ‌تاپ):

```bash
node scripts/telegram-deploy-notify.mjs --write-changelog-only
# یا دستی: --lines "..." 
```

فایل `data/deploy-changelog.txt` را همراه آپلود بفرستید تا روی سی‌پنل بدون git هم خلاصه درست برود.

اختیاری در `.env` ادمین:

```env
TELEGRAM_DEPLOY_NOTIFY_URL=https://admin.hajiasal.ir/api/cron/telegram-deploy-notify
```

دستی:

```bash
node scripts/telegram-deploy-notify.mjs --app all --lines "الرت تلگرام لایه‌ای" "ضداسپم درگاه" "آمار تهران"
```

## تست امن

```bash
# روی سرور بعد از ست کردن env
node scripts/telegram-smoke.mjs

# یا از پنل ادمین بعد از لاگین
curl -fsS -X POST -b 'admin_session=...' https://admin.hajiasal.ir/api/admin/telegram
```

```bash
npm run test -- src/lib/server/telegram-notify.test.ts src/lib/server/telegram/outbox.test.ts src/lib/server/telegram/callbacks.test.ts src/lib/server/telegram/gemini-ticket.test.ts src/lib/server/telegram/ingest.test.ts src/lib/server/telegram-sales-stats.test.ts tests/admin/telegram.behavior.test.ts
```
