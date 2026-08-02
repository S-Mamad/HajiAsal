import { NextResponse } from "next/server";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  await clearAllAuthSessions(request, response);
  return response;
}
