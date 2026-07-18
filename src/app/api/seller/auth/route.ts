import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSellerSession,
  getSellerByPhoneAsync,
  getSellerFromRequest,
  revokeSellerSession,
  sellerCookieOptions,
  SELLER_COOKIE,
  toPublicSeller,
  verifySellerPassword,
} from "@/lib/server/sellers";
import { checkRateLimit, getTrustedClientIp } from "@/lib/server/rate-limit";
import { logSellerActivity } from "@/lib/server/seller-activity";
import { clientIpFromRequest } from "@/lib/server/seller-gate";

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(4).max(128),
});

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const ipLimit = checkRateLimit(`seller-login:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { success: false, message: "تعداد تلاش زیاد است. کمی بعد دوباره تلاش کنید." },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        },
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "اطلاعات ورود نامعتبر است" },
        { status: 400 },
      );
    }

    const phoneKey = parsed.data.phone.replace(/\D/g, "");
    const phoneLimit = checkRateLimit(
      `seller-login:phone:${phoneKey}`,
      8,
      15 * 60 * 1000,
    );
    if (!phoneLimit.ok) {
      return NextResponse.json(
        { success: false, message: "تعداد تلاش برای این شماره زیاد است." },
        {
          status: 429,
          headers: { "Retry-After": String(phoneLimit.retryAfterSec) },
        },
      );
    }

    const seller = await getSellerByPhoneAsync(parsed.data.phone);
    if (!seller || seller.status !== "active") {
      return NextResponse.json(
        { success: false, message: "فروشنده یافت نشد" },
        { status: 401 },
      );
    }

    if (!verifySellerPassword(seller, parsed.data.password)) {
      return NextResponse.json(
        { success: false, message: "رمز عبور نادرست است" },
        { status: 401 },
      );
    }

    const session = await createSellerSession(seller.id);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "ایجاد نشست ممکن نشد. در محیط لوکال دوباره تلاش کنید.",
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
    response.cookies.set(sellerCookieOptions(session.token));
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    seller: toPublicSeller(seller),
  });
}

export async function DELETE(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${SELLER_COOKIE}=([^;]+)`));
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (token) await revokeSellerSession(token);

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SELLER_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
