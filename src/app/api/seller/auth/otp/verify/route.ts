import { NextResponse } from "next/server";
import { handlePanelOtpVerify } from "@/lib/auth/panel-otp";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";
import {
  createSellerSession,
  getSellerByPhoneAsync,
  sellerCookieOptions,
  toPublicSeller,
} from "@/lib/server/sellers";
import { checkRateLimitAsync, getTrustedClientIp } from "@/lib/server/rate-limit";
import { logSellerActivity } from "@/lib/server/seller-activity";
import { clientIpFromRequest } from "@/lib/server/seller-gate";

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const ipLimit = await checkRateLimitAsync(
      `seller-otp-login:ip:${ip}`,
      20,
      15 * 60 * 1000,
    );
    if (!ipLimit.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "تعداد تلاش زیاد است. کمی بعد دوباره تلاش کنید.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        },
      );
    }

    const verified = await handlePanelOtpVerify(request, "seller");
    if (!verified.ok) return verified.response;

    const seller = await getSellerByPhoneAsync(verified.phone);
    if (!seller || seller.status !== "active") {
      return NextResponse.json(
        { success: false, message: "کد تأیید نادرست است" },
        { status: 400 },
      );
    }

    const session = await createSellerSession(seller.id);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "ایجاد نشست ممکن نشد. کمی بعد دوباره تلاش کنید.",
        },
        { status: 503 },
      );
    }

    await logSellerActivity({
      sellerId: seller.id,
      action: "auth.login",
      ip: clientIpFromRequest(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    const response = NextResponse.json({
      success: true,
      seller: toPublicSeller(seller),
    });
    await clearAllAuthSessions(request, response);
    const cookie = sellerCookieOptions(session.token);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}
