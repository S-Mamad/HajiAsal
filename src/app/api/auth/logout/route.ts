import { NextResponse } from "next/server";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";
import { CUSTOMER_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  await clearAllAuthSessions(request, response);
  response.cookies.set(CUSTOMER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
