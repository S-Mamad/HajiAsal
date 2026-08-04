import { NextResponse } from "next/server";
import {
  getSellerFromRequest,
  toPublicSeller,
} from "@/lib/server/sellers";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";

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
  return response;
}
