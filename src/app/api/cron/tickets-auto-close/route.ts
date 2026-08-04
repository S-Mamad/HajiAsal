import { NextResponse } from "next/server";
import { autoCloseStaleSupportTickets } from "@/lib/server/support-tickets";
import { isProduction } from "@/lib/server/production";

/**
 * cPanel cron (daily):
 * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/tickets-auto-close
 */
export async function POST(request: Request) {
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

  const closed = await autoCloseStaleSupportTickets();
  return NextResponse.json({ success: true, closed });
}

export async function GET(request: Request) {
  return POST(request);
}
