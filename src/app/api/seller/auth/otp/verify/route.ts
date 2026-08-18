import { NextResponse } from "next/server";

/** Panel OTP login removed — use same-origin /login (shared customer session). */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "ورود پنل از صفحه /login همین دامنه است؛ این مسیر دیگر فعال نیست",
      loginUrl: "/login",
    },
    { status: 410 },
  );
}
