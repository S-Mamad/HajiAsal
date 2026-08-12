# Cloudflare Worker: Telegram Bot API Proxy (حاجی‌عسل)

برای هاست‌های ایران که به `api.telegram.org` دسترسی خروجی ندارند.

## Deploy

پیش‌نیاز: Node + حساب Cloudflare + `npx wrangler login`

```bash
cd workers/telegram-proxy

# اختیاری ولی توصیه‌شده: رمز دسترسی به ورکر
npx wrangler secret put PROXY_SECRET
# یک رشته تصادفی ۳۲+ کاراکتر وارد کن

npx wrangler deploy
```

خروجی چیزی شبیه این می‌دهد:

`https://hajiasal-telegram-proxy.<account>.workers.dev`

## اتصال به اپ حاجی‌عسل

در `.env` سرور (storefront + admin):

```env
TELEGRAM_NOTIFY_ENABLED=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ADMIN_CHAT_IDS=...
TELEGRAM_WEBHOOK_SECRET=...

# آدرس ورکر بدون اسلش پایانی
TELEGRAM_API_BASE_URL=https://hajiasal-telegram-proxy.<account>.workers.dev
# همان PROXY_SECRET ورکر
TELEGRAM_PROXY_SECRET=...
```

سپس اپ را restart کن و:

```bash
node scripts/telegram-smoke.mjs
```

ثبت webhook هم از طریق ورکر:

```bash
curl -fsS -X POST \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Proxy-Secret: $TELEGRAM_PROXY_SECRET" \
  "$TELEGRAM_API_BASE_URL/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "{\"url\":\"https://admin.hajiasal.ir/api/telegram/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\"}"
```

## نکات

- مسیر API عین تلگرام است: `/botTOKEN/method`
- بدون `PROXY_SECRET` ورکر عمومی است؛ حتماً secret بگذار
- ترافیک ورودی webhook از تلگرام → سایت شما معمولاً نیاز به ورکر ندارد؛ مشکل اصلی خروجی هاست → تلگرام است
