import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { logAdminAction } from "@/lib/server/audit-log";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import {
  getTelegramAdminChatIds,
  getTelegramApiBaseUrl,
  isTelegramNotifyEnabled,
  sendTelegramAdminTestPing,
} from "@/lib/server/telegram-notify";

/**
 * GET: status (no secrets). POST: send one safe ping to admin chats only.
 */
export async function GET(request: Request) {
  const gate = await gateAdmin(request, "settings.view");
  if (!gate.ok) return gate.response;

  const tokenSet = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const webhookSecretSet = Boolean(
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim(),
  );
  const proxySecretSet = Boolean(process.env.TELEGRAM_PROXY_SECRET?.trim());
  const chatIds = getTelegramAdminChatIds();
  const apiBase = getTelegramApiBaseUrl();

  return NextResponse.json({
    enabled: isTelegramNotifyEnabled(),
    tokenConfigured: tokenSet,
    webhookSecretConfigured: webhookSecretSet,
    proxySecretConfigured: proxySecretSet,
    apiBaseUrl: apiBase,
    usingCloudflareProxy: !apiBase.includes("api.telegram.org"),
    chatCount: chatIds.length,
    note: "اعلان فقط به چت‌های ادمین می‌رود؛ به مشتری پیامک/تلگرام خودکار از این مسیر ارسال نمی‌شود.",
  });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "settings.edit");
  if (!gate.ok) return gate.response;

  const adminKey = gate.ctx.user?.id ?? "anon";
  const limit = await checkRateLimitAsync(
    `admin-telegram-test:${adminKey}`,
    5,
    60 * 60 * 1000,
  );
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `محدودیت تست؛ حدود ${limit.retryAfterSec} ثانیه دیگر دوباره تلاش کنید.`,
      },
      { status: 429 },
    );
  }

  if (!isTelegramNotifyEnabled()) {
    return NextResponse.json(
      {
        error:
          "تلگرام غیرفعال یا ناقص است. TELEGRAM_NOTIFY_ENABLED و توکن و TELEGRAM_ADMIN_CHAT_IDS را بررسی کنید.",
      },
      { status: 503 },
    );
  }

  const result = await sendTelegramAdminTestPing();
  await logAdminAction({
    action: "telegram.test_ping",
    entityType: "telegram",
    entityId: "admin-ping",
    adminUserId: gate.ctx.user?.id,
    payload: {
      sent: result.sent,
      skipped: result.skipped,
      chatCount: result.chatCount,
    },
  });

  if (!result.sent) {
    return NextResponse.json(
      {
        success: false,
        sent: false,
        skipped: result.skipped,
        error: result.error ?? "ارسال ناموفق",
        chatCount: result.chatCount,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    sent: true,
    chatCount: result.chatCount,
    message: "پیام تست به چت‌های ادمین ارسال شد.",
  });
}
