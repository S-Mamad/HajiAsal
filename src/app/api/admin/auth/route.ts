import { NextResponse } from "next/server";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";
import { ensurePrimaryAdmins } from "@/lib/server/admin-auth";

/** Password login disabled — use OTP endpoints. */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "ورود فقط با کد پیامکی امکان‌پذیر است",
    },
    { status: 401 },
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
  const response = NextResponse.json({ success: true });
  await clearAllAuthSessions(request, response);
  return response;
}
