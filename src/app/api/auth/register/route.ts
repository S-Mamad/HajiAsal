import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth/phone";
import { registerSchema } from "@/lib/auth/validations/auth";
import {
  findProfileByPhone,
  updateProfile,
} from "@/lib/server/profiles";
import { getSessionFromRequest, createSessionToken, applySessionCookieToResponse } from "@/lib/auth/session";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";
import { isTrustedMutationOrigin } from "@/lib/auth/request-origin";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    if (!isTrustedMutationOrigin(request)) {
      return NextResponse.json(
        { success: false, message: "درخواست نامعتبر است" },
        { status: 403 },
      );
    }

    const session = getSessionFromRequest(request);
    const limited = await checkRateLimitAsync(
      `auth-register:ip:${getClientIp(request)}`,
      8,
      15 * 60 * 1000,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, message: "تعداد درخواست زیاد است. کمی بعد تلاش کنید." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(parsed.data.phone)!;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "ابتدا کد تأیید را وارد کنید و وارد شوید",
        },
        { status: 401 },
      );
    }

    if (session.phone !== phone) {
      return NextResponse.json(
        { success: false, message: "شماره موبایل با حساب فعلی مطابقت ندارد" },
        { status: 403 },
      );
    }

    let profile = await findProfileByPhone(phone);
    if (!profile || profile.id !== session.userId) {
      return NextResponse.json(
        { success: false, message: "ابتدا کد تأیید را وارد کنید" },
        { status: 400 },
      );
    }

    profile = await updateProfile(profile.id, {
      fullName: parsed.data.fullName,
      email: parsed.data.email || null,
      newsletterOptIn: parsed.data.newsletterOptIn ?? false,
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "خطا در ثبت‌نام" },
        { status: 500 },
      );
    }

    const token = createSessionToken({
      userId: profile.id,
      phone: profile.phone,
      fullName: profile.fullName,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        phone: profile.phone,
        fullName: profile.fullName,
        email: profile.email,
      },
      message: "ثبت‌نام با موفقیت انجام شد",
    });

    await clearAllAuthSessions(request, response);
    applySessionCookieToResponse(response, token);

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در ثبت‌نام" },
      { status: 500 },
    );
  }
}
