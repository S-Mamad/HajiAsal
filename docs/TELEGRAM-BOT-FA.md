# ربات تلگرام اعلان حاجی‌عسل

اعلان لحظه‌ای رویدادهای فروشگاه به چت‌های ادمین، دستورات آماری، و گزارش روزانه.

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

روی **storefront** و **admin**:

```env
TELEGRAM_NOTIFY_ENABLED=true
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_ADMIN_CHAT_IDS=-100...,123456789
TELEGRAM_WEBHOOK_SECRET=long_random_secret_here

# پروکسی Cloudflare (الزامی در ایران)
TELEGRAM_API_BASE_URL=https://hajiasal-telegram-proxy.YOUR_SUBDOMAIN.workers.dev
TELEGRAM_PROXY_SECRET=same_as_worker_PROXY_SECRET
```

- بدون `TELEGRAM_NOTIFY_ENABLED=true` چیزی ارسال نمی‌شود.
- توکن را commit نکنید.
- فقط chatهای whitelist دستورات را می‌گیرند.

## رویدادهای اعلان

| رویداد | توضیح |
|--------|--------|
| پرداخت موفق | بعد از `confirmPaidOrder` (اولین بار) |
| کمبود موجودی | اگر بعد از فروش کمبود ثبت شود |
| تغییر وضعیت / لغو / استرداد | پنل ادمین یا فروشنده |
| پرداخت ناموفق | verify زیبال / اسنپ‌پی |
| پیام تماس / خبرنامه | فرم تماس و عضویت |
| درخواست فروشنده | ثبت و تأیید/رد |
| تیکت جدید | تیکت مشتری / فروشنده |

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

دستورات: `/start` `/help` `/today` `/stats` `/orders`

## Cron گزارش روزانه

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://admin.hajiasal.ir/api/cron/telegram-digest
```

## تست امن

```bash
# روی سرور بعد از ست کردن env
node scripts/telegram-smoke.mjs

# یا از پنل ادمین بعد از لاگین
curl -fsS -X POST -b 'admin_session=...' https://admin.hajiasal.ir/api/admin/telegram
```

```bash
npm run test -- src/lib/server/telegram-notify.test.ts tests/admin/telegram.behavior.test.ts
```
