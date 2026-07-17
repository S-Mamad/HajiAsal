import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  loginAdmin,
  logoutAdmin,
  verifyAdminPassword,
} from "@/lib/server/admin";
import {
  checkAdminLoginRateLimit,
  recordAdminLoginAttempt,
} from "@/lib/server/admin-rate-limit";
import { getTrustedClientIp } from "@/lib/server/client-ip";

export async function POST(request: Request) {
  try {
    const ip = getTrustedClientIp(request);
    const rate = await checkAdminLoginRateLimit(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: rate.message },
        { status: 429 },
      );
    }

    const body = await request.json();
    const password = body.password as string | undefined;

    if (!password || !verifyAdminPassword(password)) {
      await recordAdminLoginAttempt(ip, false);
      return NextResponse.json(
        { success: false, message: "رمز عبور نادرست است" },
        { status: 401 },
      );
    }

    const token = await loginAdmin({
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    if (!token) {
      return NextResponse.json(
        { success: false, message: "پنل ادمین پیکربندی نشده است" },
        { status: 503 },
      );
    }

    const response = NextResponse.json({ success: true });
    const cookie = adminCookieOptions(token);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    try {
      await recordAdminLoginAttempt(ip, true);
    } catch {
      /* ignore */
    }
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  await logoutAdmin(request);
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
