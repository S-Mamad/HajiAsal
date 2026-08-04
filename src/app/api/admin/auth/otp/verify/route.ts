import { NextResponse } from "next/server";
import { handlePanelOtpVerify } from "@/lib/auth/panel-otp";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";
import { adminCookieOptions, loginAdmin } from "@/lib/server/admin";
import {
  ensurePrimaryAdmins,
  findAdminUserByPhone,
  touchAdminLogin,
} from "@/lib/server/admin-auth";
import { getTrustedClientIp } from "@/lib/server/client-ip";
import { logAdminAction } from "@/lib/server/audit-log";
import {
  checkAdminLoginRateLimit,
  recordAdminLoginAttempt,
} from "@/lib/server/admin-rate-limit";

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

    await ensurePrimaryAdmins();
    const verified = await handlePanelOtpVerify(request, "admin");
    if (!verified.ok) {
      await recordAdminLoginAttempt(ip, false);
      return verified.response;
    }

    const user = await findAdminUserByPhone(verified.phone);
    if (!user || user.status !== "active") {
      await recordAdminLoginAttempt(ip, false);
      return NextResponse.json(
        { success: false, message: "کد تأیید نادرست است" },
        { status: 400 },
      );
    }

    const token = await loginAdmin({
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      adminUserId: user.id,
    });

    if (!token) {
      return NextResponse.json(
        { success: false, message: "پنل ادمین پیکربندی نشده است" },
        { status: 503 },
      );
    }

    await touchAdminLogin(user.id);
    await logAdminAction({
      action: "admin.login",
      entityType: "admin_user",
      entityId: user.id,
      adminUserId: user.id,
      ipAddress: ip,
      payload: { method: "otp" },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    });
    const cookie = adminCookieOptions(token);
    try {
      await clearAllAuthSessions(request, response);
    } catch (error) {
      console.error(
        "[admin/auth/otp/verify] clear sibling sessions failed:",
        error instanceof Error ? error.message : error,
      );
    }
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
  } catch (error) {
    console.error(
      "[admin/auth/otp/verify]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}
