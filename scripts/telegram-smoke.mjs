#!/usr/bin/env node
/**
 * Safe smoke: sends ONE HTML ping to TELEGRAM_ADMIN_CHAT_IDS only.
 * Supports Cloudflare Worker proxy via TELEGRAM_API_BASE_URL.
 *
 * Usage (on server with env set):
 *   node scripts/telegram-smoke.mjs
 */
const enabled = String(process.env.TELEGRAM_NOTIFY_ENABLED ?? "")
  .trim()
  .toLowerCase();
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chats = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const apiBase = (
  process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org"
)
  .trim()
  .replace(/\/$/, "");
const proxySecret = process.env.TELEGRAM_PROXY_SECRET?.trim();

if (enabled !== "true" && enabled !== "1") {
  console.error("TELEGRAM_NOTIFY_ENABLED is off");
  process.exit(2);
}
if (!token || chats.length === 0) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_IDS");
  process.exit(2);
}

console.log("API base:", apiBase);

const text =
  "✅ تست امن حاجی‌عسل (scripts/telegram-smoke.mjs) | فقط چت ادمین.";

const headers = { "Content-Type": "application/json" };
if (proxySecret) headers["X-Telegram-Proxy-Secret"] = proxySecret;

let ok = 0;
for (const chatId of chats) {
  try {
    const res = await fetch(`${apiBase}/bot${token}/sendMessage`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    console.log(chatId, res.status, body.slice(0, 200));
    if (res.ok) ok += 1;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chatId, "fetch_failed:", msg);
  }
}

if (ok === 0) {
  console.error(
    "No message delivered. If api.telegram.org is blocked, set TELEGRAM_API_BASE_URL to your Cloudflare Worker (see workers/telegram-proxy/README.md).",
  );
  process.exit(1);
}
console.log(`Delivered to ${ok}/${chats.length} chat(s)`);
