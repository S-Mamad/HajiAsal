import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePhone } from "@/lib/auth/phone";
import { gateAdmin } from "@/lib/server/admin-gate";
import { logAdminAction } from "@/lib/server/audit-log";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import {
  getSmsProvider,
  isTransactionalSmsConfigured,
  sendTransactionalSms,
} from "@/lib/server/sms";

const MAX_MESSAGE_LEN = 500;
const ADMIN_SMS_HOURLY = 30;

const sendSchema = z.object({
  phone: z.string().min(8).max(20),
  message: z.string().min(1).max(MAX_MESSAGE_LEN),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "sms.view");
  if (!gate.ok) return gate.response;

  return NextResponse.json({
    configured: isTransactionalSmsConfigured(),
    provider: getSmsProvider(),
    maxMessageLength: MAX_MESSAGE_LEN,
    note: "پیامک خودکار سفارش خاموش است؛ فقط OTP ورود و ارسال دستی ادمین فعال‌اند.",
  });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "sms.send");
  if (!gate.ok) return gate.response;

  const parsed = sendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "شماره یا متن پیام نامعتبر است" },
      { status: 400 },
    );
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json(
      { error: "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)" },
      { status: 400 },
    );
  }

  const message = parsed.data.message.trim();
  if (!message) {
    return NextResponse.json({ error: "متن پیام خالی است" }, { status: 400 });
  }

  if (!isTransactionalSmsConfigured()) {
    return NextResponse.json(
      {
        error:
          "کانال پیامک آزاد پیکربندی نشده است. MELIPAYAMAK_SMS_URL یا SMS_API_KEY/SMS_SENDER را تنظیم کنید.",
      },
      { status: 503 },
    );
  }

  const adminKey = gate.ctx.user?.id ?? "anon";
  const limit = await checkRateLimitAsync(
    `admin-sms:${adminKey}`,
    ADMIN_SMS_HOURLY,
    60 * 60 * 1000,
  );
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `محدودیت ارسال؛ حدود ${limit.retryAfterSec} ثانیه دیگر دوباره تلاش کنید.`,
      },
      { status: 429 },
    );
  }

  const result = await sendTransactionalSms(phone, message);
  if (!result.ok) {
    console.error("[admin-sms]", phone, result.error);
    return NextResponse.json(
      { error: result.error ?? "ارسال پیامک ناموفق بود" },
      { status: 502 },
    );
  }

  await logAdminAction({
    action: "sms.send",
    entityType: "sms",
    entityId: phone,
    adminUserId: gate.ctx.user?.id,
    payload: {
      phone,
      messageLength: message.length,
      provider: getSmsProvider(),
    },
  });

  return NextResponse.json({ success: true, phone });
}
