import { NextResponse } from "next/server";
import {
  getSellerFromRequest,
  toPublicSeller,
} from "@/lib/server/sellers";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";
import { clearSessionCookieOnResponse } from "@/lib/auth/session";

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
  const response = NextResponse.json({ success: true });
  await clearAllAuthSessions(request, response);
  clearSessionCookieOnResponse(response);
  return response;
}
