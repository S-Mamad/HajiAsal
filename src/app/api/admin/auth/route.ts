import { NextResponse } from "next/server";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";
import { clearSessionCookieOnResponse } from "@/lib/auth/session";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  ensurePrimaryAdmins,
  getAdminAuthFromCustomerSession,
} from "@/lib/server/admin-auth";

/** Password login disabled — use same-origin /login OTP. */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "ورود پنل از صفحه /login همین دامنه است؛ این مسیر دیگر فعال نیست",
    },
    { status: 410 },
  );
}

export async function GET(request: Request) {
  try {
    await ensurePrimaryAdmins();
  } catch (error) {
    console.error(
      "[admin/auth] ensurePrimaryAdmins:",
      error instanceof Error ? error.message : error,
    );
  }

  const session = getSessionFromRequest(request);
  const ctx = await getAdminAuthFromCustomerSession(session);
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
  const response = NextResponse.json({ success: true });
  await clearAllAuthSessions(request, response);
  clearSessionCookieOnResponse(response);
  return response;
}
