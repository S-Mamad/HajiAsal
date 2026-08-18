import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupportGuestToken,
  parseSupportGuestToken,
  supportGuestCookieOptions,
} from "@/lib/server/support-guest";
import {
  checkRateLimitAsync,
  getTrustedClientIp,
} from "@/lib/server/rate-limit";
import { normalizePhone } from "@/lib/auth/phone";

const schema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().min(10).max(20),
});

/** Register guest name+phone for support FAB (no OTP). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "نام و شماره موبایل را درست وارد کنید" },
      { status: 400 },
    );
  }

  const ip = getTrustedClientIp(request);
  const phoneKey = normalizePhone(parsed.data.phone) ?? parsed.data.phone;
  const [ipRl, phoneRl] = await Promise.all([
    checkRateLimitAsync(`support-guest:ip:${ip}`, 20, 60 * 60 * 1000),
    checkRateLimitAsync(`support-guest:phone:${phoneKey}`, 8, 60 * 60 * 1000),
  ]);
  if (!ipRl.ok || !phoneRl.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
        retryAfterSec: Math.max(ipRl.retryAfterSec, phoneRl.retryAfterSec),
      },
      { status: 429 },
    );
  }

  try {
    const token = createSupportGuestToken({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
    });
    const payload = parseSupportGuestToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "ثبت مشخصات ناموفق بود" },
        { status: 500 },
      );
    }
    const cookie = supportGuestCookieOptions(token);
    const res = NextResponse.json({
      success: true,
      identified: true,
      authenticated: false,
      kind: "guest" as const,
      guest: { fullName: payload.fullName, phone: payload.phone },
      user: { fullName: payload.fullName, phone: payload.phone },
    });
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
      ...(cookie.domain ? { domain: cookie.domain } : {}),
    });
    return res;
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVALID_PHONE") {
      return NextResponse.json(
        { success: false, message: "شماره موبایل معتبر نیست" },
        { status: 400 },
      );
    }
    if (code === "INVALID_NAME") {
      return NextResponse.json(
        { success: false, message: "نام باید حداقل ۲ حرف باشد" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, message: "ثبت مشخصات ناموفق بود" },
      { status: 500 },
    );
  }
}
