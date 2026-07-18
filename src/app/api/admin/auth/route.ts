import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  loginAdmin,
  logoutAdmin,
} from "@/lib/server/admin";
import {
  authenticateAdminCredentials,
  touchAdminLogin,
} from "@/lib/server/admin-auth";
import {
  checkAdminLoginRateLimit,
  recordAdminLoginAttempt,
} from "@/lib/server/admin-rate-limit";
import { getTrustedClientIp } from "@/lib/server/client-ip";
import { logAdminAction } from "@/lib/server/audit-log";

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
    const login = (body.login as string | undefined)?.trim();

    if (!password) {
      await recordAdminLoginAttempt(ip, false);
      return NextResponse.json(
        { success: false, message: "رمز عبور الزامی است" },
        { status: 401 },
      );
    }

    const result = await authenticateAdminCredentials({ password, login });
    if (!result) {
      await recordAdminLoginAttempt(ip, false);
      return NextResponse.json(
        { success: false, message: "اطلاعات ورود نادرست است" },
        { status: 401 },
      );
    }

    const token = await loginAdmin({
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      adminUserId: result.user?.id ?? null,
    });

    if (!token) {
      return NextResponse.json(
        { success: false, message: "پنل ادمین پیکربندی نشده است" },
        { status: 503 },
      );
    }

    if (result.user) {
      await touchAdminLogin(result.user.id);
    }

    await logAdminAction({
      action: "admin.login",
      entityType: "admin_user",
      entityId: result.user?.id,
      adminUserId: result.user?.id,
      ipAddress: ip,
      payload: { legacy: result.legacy },
    });

    const response = NextResponse.json({
      success: true,
      user: result.user
        ? {
            id: result.user.id,
            fullName: result.user.fullName,
            role: result.user.role,
          }
        : null,
    });
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

export async function GET(request: Request) {
  const { getAdminAuthFromToken } = await import("@/lib/server/admin-auth");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/hajiasal_admin_session=([^;]+)/);
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  const ctx = await getAdminAuthFromToken(token);
  if (!ctx.authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    legacy: ctx.legacy,
    user: ctx.user
      ? {
          id: ctx.user.id,
          fullName: ctx.user.fullName,
          email: ctx.user.email,
          phone: ctx.user.phone,
          role: ctx.user.role,
        }
      : null,
    role: ctx.role,
  });
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
