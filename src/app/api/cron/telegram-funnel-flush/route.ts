import { NextResponse } from "next/server";
import { isProduction } from "@/lib/server/production";

export const runtime = "nodejs";

/**
 * Funnel digest removed. Kept so leftover cPanel crons return 200 instead of 404.
 */
async function gone(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: isProduction() ? "پیکربندی ناقص" : "CRON_SECRET تنظیم نشده" },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const urlSecret = new URL(request.url).searchParams.get("secret") ?? "";
  if (bearer !== secret && urlSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    sent: false,
    skipped: "removed",
  });
}

export async function POST(request: Request) {
  return gone(request);
}

export async function GET(request: Request) {
  return gone(request);
}
